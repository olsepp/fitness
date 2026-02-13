import { BaseRepository } from './base.repository';
import type { WorkoutType } from '$lib/types';

/**
 * Repository for WorkoutType entity operations.
 * 
 * Note: Workout types are shared across all users (not user-specific),
 * so no ownership verification is needed.
 */
export class WorkoutTypeRepository extends BaseRepository {
	/**
	 * Get all workout types.
	 * These are shared across all users.
	 */
	async list(): Promise<WorkoutType[]> {
		const { data, error } = await this.supabase
			.from('workout_type')
			.select('id,key,name,icon')
			.order('name', { ascending: true });

		if (error) {
			console.error('[WorkoutTypeRepository.list] Error:', error);
			throw error;
		}

		return (data ?? []) as WorkoutType[];
	}

	/**
	 * Get a single workout type by ID.
	 */
	async getById(id: string): Promise<WorkoutType | null> {
		const { data, error } = await this.supabase
			.from('workout_type')
			.select('id,key,name,icon')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null; // Not found
			console.error('[WorkoutTypeRepository.getById] Error:', error);
			throw error;
		}

		return data as WorkoutType;
	}

	/**
	 * Get a single workout type by key.
	 */
	async getByKey(key: string): Promise<WorkoutType | null> {
		const { data, error } = await this.supabase
			.from('workout_type')
			.select('id,key,name,icon')
			.eq('key', key)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null; // Not found
			console.error('[WorkoutTypeRepository.getByKey] Error:', error);
			throw error;
		}

		return data as WorkoutType;
	}
}
