import { BaseRepository } from './base.repository';
import type { Exercise } from '$lib/types';

type ExerciseInsert = {
	name: string;
	notes?: string | null;
};

type ExerciseUpdate = {
	name?: string;
	notes?: string | null;
};

/**
 * Repository for Exercise entity operations.
 * All methods require authentication and only operate on the current user's exercises.
 */
export class ExerciseRepository extends BaseRepository {
	/**
	 * Get all exercises for the current user.
	 */
	async list(): Promise<Exercise[]> {
		const userId = await this.getUserId();

		const { data, error } = await this.supabase
			.from('exercise')
			.select('id,user_id,name,notes,created_at')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('[ExerciseRepository.list] Error:', error);
			throw error;
		}

		return data ?? [];
	}

	/**
	 * Get a single exercise by ID.
	 * Returns null if not found or not owned by the current user.
	 */
	async getById(id: string): Promise<Exercise | null> {
		const userId = await this.getUserId();

		const { data, error } = await this.supabase
			.from('exercise')
			.select('id,user_id,name,notes,created_at')
			.eq('id', id)
			.eq('user_id', userId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null; // Not found
			console.error('[ExerciseRepository.getById] Error:', error);
			throw error;
		}

		return data;
	}

	/**
	 * Create a new exercise for the current user.
	 */
	async create(payload: ExerciseInsert): Promise<Exercise> {
		const userId = await this.getUserId();

		const { data, error } = await this.supabase
			.from('exercise')
			.insert({
				name: payload.name,
				notes: payload.notes ?? null,
				user_id: userId
			})
			.select('id,user_id,name,notes,created_at')
			.single();

		if (error) {
			console.error('[ExerciseRepository.create] Error:', error);
			throw error;
		}

		return data;
	}

	/**
	 * Update an existing exercise.
	 * Only updates fields that are provided in the payload.
	 */
	async update(id: string, payload: ExerciseUpdate): Promise<Exercise> {
		const userId = await this.getUserId();

		const updateData: Record<string, unknown> = {};
		if (payload.name !== undefined) updateData.name = payload.name;
		if (payload.notes !== undefined) updateData.notes = payload.notes;

		const { data, error } = await this.supabase
			.from('exercise')
			.update(updateData)
			.eq('id', id)
			.eq('user_id', userId)
			.select('id,user_id,name,notes,created_at')
			.single();

		if (error) {
			console.error('[ExerciseRepository.update] Error:', error);
			throw error;
		}

		return data;
	}

	/**
	 * Delete an exercise.
	 * Only succeeds if the exercise belongs to the current user.
	 */
	async delete(id: string): Promise<void> {
		const userId = await this.getUserId();

		const { error } = await this.supabase
			.from('exercise')
			.delete()
			.eq('id', id)
			.eq('user_id', userId);

		if (error) {
			console.error('[ExerciseRepository.delete] Error:', error);
			throw error;
		}
	}
}
