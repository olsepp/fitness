import { BaseRepository } from './base.repository';
import type { WorkoutSession } from '$lib/types';

/**
 * Shared select query for workout sessions with related data.
 * Used consistently across all session queries to ensure data shape consistency.
 */
const SESSION_SELECT = [
	'id',
	'workout_type_id',
	'date',
	'notes',
	'is_completed',
	'created_at',
	'workout_type(id,key,name,icon)',
	'workout_exercise(id,workout_session_id,exercise_id,name_snapshot,notes,is_completed,order_index,created_at,exercise(exercise_type),workout_set(id,workout_exercise_id,reps,weight,distance,order_index,created_at))'
].join(',');

type WorkoutSessionInsert = {
	workout_type_id: string;
	date: string;
	notes?: string | null;
};

type WorkoutSessionUpdate = {
	workout_type_id?: string;
	date?: string;
	notes?: string | null;
	is_completed?: boolean;
};

/**
 * Repository for WorkoutSession entity operations.
 * All methods require authentication and only operate on the current user's sessions.
 */
export class WorkoutSessionRepository extends BaseRepository {
	/**
	 * Get all workout sessions for the current user.
	 * Includes related workout type, exercises, and sets.
	 */
	async list(): Promise<WorkoutSession[]> {
		const userId = await this.getUserId();

		const { data, error } = await this.supabase
			.from('workout_session')
			.select(SESSION_SELECT)
			.eq('user_id', userId)
			.order('date', { ascending: false })
			.order('order_index', { referencedTable: 'workout_exercise', ascending: true })
			.order('order_index', { referencedTable: 'workout_exercise.workout_set', ascending: true });

		if (error) {
			console.error('[WorkoutSessionRepository.list] Error:', error);
			throw error;
		}

		return (data ?? []) as unknown as WorkoutSession[];
	}

	/**
	 * Get a single workout session by ID.
	 * Returns null if not found or not owned by the current user.
	 */
	async getById(id: string): Promise<WorkoutSession | null> {
		const userId = await this.getUserId();

		const { data, error } = await this.supabase
			.from('workout_session')
			.select(SESSION_SELECT)
			.eq('id', id)
			.eq('user_id', userId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null; // Not found
			console.error('[WorkoutSessionRepository.getById] Error:', error);
			throw error;
		}

		return data as unknown as WorkoutSession;
	}

	/**
	 * Create a new workout session for the current user.
	 */
	async create(payload: WorkoutSessionInsert): Promise<WorkoutSession> {
		const userId = await this.getUserId();

		const { data, error } = await this.supabase
			.from('workout_session')
			.insert({
				user_id: userId,
				workout_type_id: payload.workout_type_id,
				date: payload.date,
				notes: payload.notes ?? null
			})
			.select(SESSION_SELECT)
			.single();

		if (error) {
			console.error('[WorkoutSessionRepository.create] Error:', error);
			throw error;
		}

		return data as unknown as WorkoutSession;
	}

	/**
	 * Update an existing workout session.
	 * Only updates fields that are provided in the payload.
	 */
	async update(id: string, payload: WorkoutSessionUpdate): Promise<WorkoutSession> {
		const userId = await this.getUserId();

		const updateData: Record<string, unknown> = {};
		if (payload.workout_type_id !== undefined) updateData.workout_type_id = payload.workout_type_id;
		if (payload.date !== undefined) updateData.date = payload.date;
		if (payload.notes !== undefined) updateData.notes = payload.notes;
		if (payload.is_completed !== undefined) updateData.is_completed = payload.is_completed;

		const { data, error } = await this.supabase
			.from('workout_session')
			.update(updateData)
			.eq('id', id)
			.eq('user_id', userId)
			.select(SESSION_SELECT)
			.single();

		if (error) {
			console.error('[WorkoutSessionRepository.update] Error:', error);
			throw error;
		}

		return data as unknown as WorkoutSession;
	}

	/**
	 * Delete a workout session.
	 * Only succeeds if the session belongs to the current user.
	 */
	async delete(id: string): Promise<void> {
		const userId = await this.getUserId();

		const { error } = await this.supabase
			.from('workout_session')
			.delete()
			.eq('id', id)
			.eq('user_id', userId);

		if (error) {
			console.error('[WorkoutSessionRepository.delete] Error:', error);
			throw error;
		}
	}

	/**
	 * Toggle the completion status of a workout session.
	 */
	async toggleComplete(id: string, isCompleted: boolean): Promise<WorkoutSession> {
		return this.update(id, { is_completed: isCompleted });
	}

	/**
	 * Check if a workout session exists and belongs to the current user.
	 */
	async exists(id: string): Promise<boolean> {
		const userId = await this.getUserId();

		const { data, error } = await this.supabase
			.from('workout_session')
			.select('id')
			.eq('id', id)
			.eq('user_id', userId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return false;
			console.error('[WorkoutSessionRepository.exists] Error:', error);
			throw error;
		}

		return !!data;
	}
}
