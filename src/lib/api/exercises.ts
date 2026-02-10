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
	console.log('[listExercises] Called');
	console.log('[listExercises] Supabase client exists:', !!supabase);

	const user = await requireUser(supabase);
	console.log('[listExercises] User:', user?.id);

	const { data, error } = await supabase
		.from('exercise')
		.select('id,user_id,name,notes,created_at')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false });

	if (error) {
		console.error('[listExercises] Error:', error);
		throw error;
	}

	console.log('[listExercises] Success, count:', data?.length);
	return data ?? [];
};

export const getExerciseById = async (supabase: SupabaseClient, id: string): Promise<Exercise> => {
	console.log('[getExerciseById] Called with id:', id);
	console.log('[getExerciseById] Supabase client exists:', !!supabase);

	const user = await requireUser(supabase);
	console.log('[getExerciseById] User:', user?.id);

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

	console.log('[getExerciseById] Success:', data?.id);
	return data;
};

export const createExercise = async (
	supabase: SupabaseClient,
	payload: ExerciseInsert
): Promise<Exercise> => {
	console.log('[createExercise] ===== START =====');
	console.log('[createExercise] Payload:', payload);
	console.log('[createExercise] Supabase client exists:', !!supabase);
	console.log('[createExercise] Supabase client type:', typeof supabase);
	console.log('[createExercise] Supabase has auth:', !!supabase?.auth);
	console.log('[createExercise] Supabase has from:', !!supabase?.from);

	console.log('[createExercise] About to call requireUser...');
	const user = await requireUser(supabase);
	console.log('[createExercise] requireUser returned, User ID:', user?.id);
	console.log('[createExercise] User email:', user?.email);

	console.log('[createExercise] About to insert into database...');
	const { data, error } = await supabase
		.from('exercise')
		.insert({
			name: payload.name,
			notes: payload.notes ?? null,
			user_id: user.id
		})
		.select('id,user_id,name,notes,created_at')
		.single();

	console.log('[createExercise] Database response:', { data, error });

	if (error) {
		console.error('[createExercise] Database error:', error);
		console.error('[createExercise] Error details:', JSON.stringify(error, null, 2));
		throw error;
	}

	console.log('[createExercise] Success! Created exercise:', data);
	console.log('[createExercise] ===== END =====');
	return data;
};

export const updateExercise = async (
	supabase: SupabaseClient,
	id: string,
	payload: ExerciseUpdate
): Promise<Exercise> => {
	console.log('[updateExercise] Called with id:', id);
	console.log('[updateExercise] Payload:', payload);
	console.log('[updateExercise] Supabase client exists:', !!supabase);

	const user = await requireUser(supabase);
	console.log('[updateExercise] User:', user?.id);

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

	console.log('[updateExercise] Success:', data?.id);
	return data;
};

export const deleteExercise = async (supabase: SupabaseClient, id: string): Promise<void> => {
	console.log('[deleteExercise] Called with id:', id);
	console.log('[deleteExercise] Supabase client exists:', !!supabase);

	const user = await requireUser(supabase);
	console.log('[deleteExercise] User:', user?.id);

	const { error } = await supabase
		.from('exercise')
		.delete()
		.eq('id', id)
		.eq('user_id', user.id);

	if (error) {
		console.error('[deleteExercise] Error:', error);
		throw error;
	}

	console.log('[deleteExercise] Success');
};