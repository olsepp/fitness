import { BaseRepository } from './base.repository';
import type { WorkoutSet } from '$lib/types';

/**
 * Shared select query for workout sets.
 */
const SET_SELECT = ['id', 'workout_exercise_id', 'reps', 'weight', 'calories', 'distance', 'order_index', 'created_at'].join(
	','
);

type WorkoutSetInsert = {
	workout_exercise_id: string;
	reps: number;
	weight?: number | null;
	calories?: number | null;
	distance?: number | null;
	order_index: number;
};

type WorkoutSetUpdate = {
	reps?: number;
	weight?: number | null;
	calories?: number | null;
	distance?: number | null;
	order_index?: number;
};

/**
 * Repository for WorkoutSet entity operations.
 * 
 * All methods verify that the workout set belongs to a workout session
 * owned by the current user.
 */
export class WorkoutSetRepository extends BaseRepository {
	/**
	 * Get the workout session ID for a workout set.
	 * Used for ownership verification.
	 */
	private async getWorkoutSessionId(setId: string): Promise<string | null> {
		const { data: set, error: setError } = await this.supabase
			.from('workout_set')
			.select('workout_exercise_id')
			.eq('id', setId)
			.single();

		if (setError || !set) return null;

		const { data: exercise, error: exerciseError } = await this.supabase
			.from('workout_exercise')
			.select('workout_session_id')
			.eq('id', set.workout_exercise_id)
			.single();

		if (exerciseError || !exercise) return null;
		return exercise.workout_session_id;
	}

	/**
	 * Get the workout session ID for a workout exercise.
	 */
	private async getSessionIdFromExercise(workoutExerciseId: string): Promise<string | null> {
		const { data, error } = await this.supabase
			.from('workout_exercise')
			.select('workout_session_id')
			.eq('id', workoutExerciseId)
			.single();

		if (error || !data) return null;
		return data.workout_session_id;
	}

	/**
	 * Verify ownership of a workout set by checking the workout session.
	 */
	private async verifySetOwnership(setId: string): Promise<boolean> {
		const sessionId = await this.getWorkoutSessionId(setId);
		if (!sessionId) return false;

		const userId = await this.getUserId();
		const { data, error } = await this.supabase
			.from('workout_session')
			.select('id')
			.eq('id', sessionId)
			.eq('user_id', userId)
			.single();

		return !error && !!data;
	}

	/**
	 * Verify ownership of a workout exercise by checking the workout session.
	 */
	private async verifyExerciseOwnership(workoutExerciseId: string): Promise<boolean> {
		const sessionId = await this.getSessionIdFromExercise(workoutExerciseId);
		if (!sessionId) return false;

		const userId = await this.getUserId();
		const { data, error } = await this.supabase
			.from('workout_session')
			.select('id')
			.eq('id', sessionId)
			.eq('user_id', userId)
			.single();

		return !error && !!data;
	}

	/**
	 * Add a set to a workout exercise.
	 */
	async add(payload: WorkoutSetInsert): Promise<WorkoutSet> {
		const isOwner = await this.verifyExerciseOwnership(payload.workout_exercise_id);
		if (!isOwner) {
			throw new Error('Not authorized to add sets to this exercise');
		}

		const { data, error } = await this.supabase
			.from('workout_set')
			.insert({
				workout_exercise_id: payload.workout_exercise_id,
				reps: payload.reps,
				weight: payload.weight ?? null,
				calories: payload.calories ?? null,
				distance: payload.distance ?? null,
				order_index: payload.order_index
			})
			.select(SET_SELECT)
			.single();

		if (error) {
			console.error('[WorkoutSetRepository.add] Error:', error);
			throw error;
		}

		return data as unknown as WorkoutSet;
	}

	/**
	 * Update a workout set.
	 */
	async update(id: string, payload: WorkoutSetUpdate): Promise<WorkoutSet> {
		const isOwner = await this.verifySetOwnership(id);
		if (!isOwner) {
			throw new Error('Not authorized to update this set');
		}

		const updateData: Record<string, unknown> = {};
		if (payload.reps !== undefined) updateData.reps = payload.reps;
		if (payload.weight !== undefined) updateData.weight = payload.weight;
		if (payload.calories !== undefined) updateData.calories = payload.calories;
		if (payload.distance !== undefined) updateData.distance = payload.distance;
		if (payload.order_index !== undefined) updateData.order_index = payload.order_index;

		const { data, error } = await this.supabase
			.from('workout_set')
			.update(updateData)
			.eq('id', id)
			.select(SET_SELECT)
			.single();

		if (error) {
			console.error('[WorkoutSetRepository.update] Error:', error);
			throw error;
		}

		return data as unknown as WorkoutSet;
	}

	/**
	 * Delete a workout set.
	 */
	async delete(id: string): Promise<void> {
		const isOwner = await this.verifySetOwnership(id);
		if (!isOwner) {
			throw new Error('Not authorized to delete this set');
		}

		const { error } = await this.supabase.from('workout_set').delete().eq('id', id);

		if (error) {
			console.error('[WorkoutSetRepository.delete] Error:', error);
			throw error;
		}
	}

	/**
	 * Delete multiple workout sets by IDs.
	 * Verifies ownership through the workout session.
	 */
	async deleteMany(ids: string[]): Promise<void> {
		if (ids.length === 0) return;

		// Get all workout exercise IDs for these sets
		const { data: sets, error: fetchError } = await this.supabase
			.from('workout_set')
			.select('id, workout_exercise_id')
			.in('id', ids);

		if (fetchError || !sets) {
			console.error('[WorkoutSetRepository.deleteMany] Fetch error:', fetchError);
			throw fetchError;
		}

		// Get all workout session IDs
		const exerciseIds = [...new Set(sets.map((s) => s.workout_exercise_id))];
		const { data: exercises, error: exerciseError } = await this.supabase
			.from('workout_exercise')
			.select('id, workout_session_id')
			.in('id', exerciseIds);

		if (exerciseError || !exercises) {
			throw exerciseError;
		}

		// Verify ownership of all sessions
		const sessionIds = [...new Set(exercises.map((e) => e.workout_session_id))];
		const userId = await this.getUserId();

		const { data: sessions, error: sessionError } = await this.supabase
			.from('workout_session')
			.select('id')
			.in('id', sessionIds)
			.eq('user_id', userId);

		if (sessionError || !sessions || sessions.length !== sessionIds.length) {
			throw new Error('Not authorized to delete one or more sets');
		}

		// Delete all sets
		const { error: deleteError } = await this.supabase.from('workout_set').delete().in('id', ids);

		if (deleteError) {
			console.error('[WorkoutSetRepository.deleteMany] Delete error:', deleteError);
			throw deleteError;
		}
	}
}
