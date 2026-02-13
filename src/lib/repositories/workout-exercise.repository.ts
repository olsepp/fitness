import { BaseRepository } from './base.repository';
import type { WorkoutExercise } from '$lib/types';

/**
 * Shared select query for workout exercises with related sets.
 */
const EXERCISE_SELECT = [
	'id',
	'workout_session_id',
	'exercise_id',
	'name_snapshot',
	'notes',
	'is_completed',
	'order_index',
	'created_at',
	'workout_set(id,workout_exercise_id,reps,weight,order_index,created_at)'
].join(',');

type WorkoutExerciseInsert = {
	workout_session_id: string;
	exercise_id: string;
	name_snapshot: string;
	order_index: number;
	notes?: string | null;
};

type WorkoutExerciseUpdate = {
	name_snapshot?: string;
	notes?: string | null;
	is_completed?: boolean;
	order_index?: number;
};

/**
 * Repository for WorkoutExercise entity operations.
 * 
 * Note: These are exercises within a workout session, not the exercise definitions.
 * All methods verify that the workout session belongs to the current user.
 */
export class WorkoutExerciseRepository extends BaseRepository {
	/**
	 * Verify that the current user owns the workout session.
	 * Throws an error if not authorized.
	 */
	private async verifyWorkoutSessionOwnership(workoutSessionId: string): Promise<void> {
		const userId = await this.getUserId();

		const { data, error } = await this.supabase
			.from('workout_session')
			.select('id')
			.eq('id', workoutSessionId)
			.eq('user_id', userId)
			.single();

		if (error || !data) {
			throw new Error('Not authorized to access this workout session');
		}
	}

	/**
	 * Get the workout session ID for a workout exercise.
	 * Used for ownership verification.
	 */
	private async getWorkoutSessionId(workoutExerciseId: string): Promise<string | null> {
		const { data, error } = await this.supabase
			.from('workout_exercise')
			.select('workout_session_id')
			.eq('id', workoutExerciseId)
			.single();

		if (error) return null;
		return data.workout_session_id;
	}

	/**
	 * Verify ownership of a workout exercise by checking the workout session.
	 */
	private async verifyExerciseOwnership(workoutExerciseId: string): Promise<boolean> {
		const sessionId = await this.getWorkoutSessionId(workoutExerciseId);
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
	 * Add an exercise to a workout session.
	 */
	async add(payload: WorkoutExerciseInsert): Promise<WorkoutExercise> {
		await this.verifyWorkoutSessionOwnership(payload.workout_session_id);

		const { data, error } = await this.supabase
			.from('workout_exercise')
			.insert({
				workout_session_id: payload.workout_session_id,
				exercise_id: payload.exercise_id,
				name_snapshot: payload.name_snapshot,
				order_index: payload.order_index,
				notes: payload.notes ?? null,
				is_completed: false
			})
			.select(EXERCISE_SELECT)
			.single();

		if (error) {
			console.error('[WorkoutExerciseRepository.add] Error:', error);
			throw error;
		}

		return data as unknown as WorkoutExercise;
	}

	/**
	 * Update a workout exercise.
	 */
	async update(id: string, payload: WorkoutExerciseUpdate): Promise<WorkoutExercise> {
		const isOwner = await this.verifyExerciseOwnership(id);
		if (!isOwner) {
			throw new Error('Not authorized to update this exercise');
		}

		const updateData: Record<string, unknown> = {};
		if (payload.name_snapshot !== undefined) updateData.name_snapshot = payload.name_snapshot;
		if (payload.notes !== undefined) updateData.notes = payload.notes;
		if (payload.is_completed !== undefined) updateData.is_completed = payload.is_completed;
		if (payload.order_index !== undefined) updateData.order_index = payload.order_index;

		const { data, error } = await this.supabase
			.from('workout_exercise')
			.update(updateData)
			.eq('id', id)
			.select(EXERCISE_SELECT)
			.single();

		if (error) {
			console.error('[WorkoutExerciseRepository.update] Error:', error);
			throw error;
		}

		return data as unknown as WorkoutExercise;
	}

	/**
	 * Delete a workout exercise.
	 */
	async delete(id: string): Promise<void> {
		const isOwner = await this.verifyExerciseOwnership(id);
		if (!isOwner) {
			throw new Error('Not authorized to delete this exercise');
		}

		const { error } = await this.supabase.from('workout_exercise').delete().eq('id', id);

		if (error) {
			console.error('[WorkoutExerciseRepository.delete] Error:', error);
			throw error;
		}
	}

	/**
	 * Toggle the completion status of a workout exercise.
	 */
	async toggleComplete(id: string, isCompleted: boolean): Promise<WorkoutExercise> {
		return this.update(id, { is_completed: isCompleted });
	}

	/**
	 * Delete multiple workout exercises by IDs.
	 * Verifies ownership of each exercise's parent session.
	 */
	async deleteMany(ids: string[]): Promise<void> {
		if (ids.length === 0) return;

		// Get all workout session IDs for these exercises
		const { data: exercises, error: fetchError } = await this.supabase
			.from('workout_exercise')
			.select('id, workout_session_id')
			.in('id', ids);

		if (fetchError || !exercises) {
			console.error('[WorkoutExerciseRepository.deleteMany] Fetch error:', fetchError);
			throw fetchError;
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
			throw new Error('Not authorized to delete one or more exercises');
		}

		// Delete all exercises
		const { error: deleteError } = await this.supabase.from('workout_exercise').delete().in('id', ids);

		if (deleteError) {
			console.error('[WorkoutExerciseRepository.deleteMany] Delete error:', deleteError);
			throw deleteError;
		}
	}
}
