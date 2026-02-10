import type { SupabaseClient } from '@supabase/supabase-js';
import type { Exercise } from '$lib/types';
import { requireUser } from '$lib/auth';

type ExerciseInsert = {
	name: string;
	notes?: string | null;
};

type ExerciseUpdate = {
	name?: string;
	notes?: string | null;
};

export const listExercises = async (supabase: SupabaseClient): Promise<Exercise[]> => {
	const user = await requireUser(supabase);

	const { data, error } = await supabase
		.from('exercise')
		.select('id,user_id,name,notes,created_at')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false });

	if (error) {
		console.error('[listExercises] Error:', error);
		throw error;
	}

	return data ?? [];
};

export const getExerciseById = async (supabase: SupabaseClient, id: string): Promise<Exercise> => {
	const user = await requireUser(supabase);

	const { data, error } = await supabase
		.from('exercise')
		.select('id,user_id,name,notes,created_at')
		.eq('id', id)
		.eq('user_id', user.id)
		.single();

	if (error) {
		console.error('[getExerciseById] Error:', error);
		throw error;
	}

	return data;
};

export const createExercise = async (
	supabase: SupabaseClient,
	payload: ExerciseInsert
): Promise<Exercise> => {
	const user = await requireUser(supabase);
	const { data, error } = await supabase
		.from('exercise')
		.insert({
			name: payload.name,
			notes: payload.notes ?? null,
			user_id: user.id
		})
		.select('id,user_id,name,notes,created_at')
		.single();

	if (error) {
		console.error('[createExercise] Database error:', error);
		console.error('[createExercise] Error details:', JSON.stringify(error, null, 2));
		throw error;
	}

	return data;
};

export const updateExercise = async (
	supabase: SupabaseClient,
	id: string,
	payload: ExerciseUpdate
): Promise<Exercise> => {
	const user = await requireUser(supabase);

	const { data, error } = await supabase
		.from('exercise')
		.update({
			...(payload.name !== undefined ? { name: payload.name } : {}),
			...(payload.notes !== undefined ? { notes: payload.notes } : {})
		})
		.eq('id', id)
		.eq('user_id', user.id)
		.select('id,user_id,name,notes,created_at')
		.single();

	if (error) {
		console.error('[updateExercise] Error:', error);
		throw error;
	}

	return data;
};

export const deleteExercise = async (supabase: SupabaseClient, id: string): Promise<void> => {
	const user = await requireUser(supabase);

	const { error } = await supabase
		.from('exercise')
		.delete()
		.eq('id', id)
		.eq('user_id', user.id);

	if (error) {
		console.error('[deleteExercise] Error:', error);
		throw error;
	}

};
