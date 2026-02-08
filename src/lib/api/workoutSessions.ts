import { supabase } from '$lib/supabaseClient';
import type { WorkoutSession } from '$lib/types';
import { requireUser } from '$lib/auth';

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

const sessionSelect = [
	'id',
	'workout_type_id',
	'date',
	'notes',
	'is_completed',
	'created_at',
	'workout_type(id,key,name,icon)',
	'workout_exercise(id,workout_session_id,exercise_id,name_snapshot,notes,is_completed,order_index,created_at,workout_set(id,workout_exercise_id,reps,weight,order_index,created_at))',
].join(',');

export const listWorkoutSessions = async (): Promise<WorkoutSession[]> => {
	const user = await requireUser();

	const { data, error } = await supabase
		.from('workout_session')
		.select(sessionSelect)
		.eq('user_id', user.id)
		.order('date', { ascending: false })
		.order('order_index', { referencedTable: 'workout_exercise', ascending: true })
		.order('order_index', { referencedTable: 'workout_exercise.workout_set', ascending: true });

	if (error) {
		throw error;
	}

	return (data ?? []) as unknown as WorkoutSession[];
};

export const getWorkoutSession = async (id: string): Promise<WorkoutSession> => {
	const user = await requireUser();

	const { data, error } = await supabase
		.from('workout_session')
		.select(sessionSelect)
		.eq('id', id)
		.eq('user_id', user.id)
		.single();

	if (error) {
		throw error;
	}

	return data as unknown as WorkoutSession;
};

export const createWorkoutSession = async (
	payload: WorkoutSessionInsert,
): Promise<WorkoutSession> => {
	const user = await requireUser();

	const { data, error } = await supabase
		.from('workout_session')
		.insert({
			user_id: user.id,
			workout_type_id: payload.workout_type_id,
			date: payload.date,
			notes: payload.notes ?? null,
		})
			.select(sessionSelect)
			.single();

	if (error) {
		console.error('Supabase createWorkoutSession error:', error);
		throw error;
	}

	return data as unknown as WorkoutSession;
};

export const updateWorkoutSession = async (
	id: string,
	payload: WorkoutSessionUpdate,
): Promise<WorkoutSession> => {
	const user = await requireUser();

	const { data, error } = await supabase
		.from('workout_session')
		.update({
			...(payload.workout_type_id !== undefined
				? { workout_type_id: payload.workout_type_id }
				: {}),
			...(payload.date !== undefined ? { date: payload.date } : {}),
			...(payload.notes !== undefined ? { notes: payload.notes } : {}),
			...(payload.is_completed !== undefined ? { is_completed: payload.is_completed } : {}),
		})
		.eq('id', id)
		.eq('user_id', user.id)
		.select(sessionSelect)
		.single();

	if (error) {
		throw error;
	}

	return data as unknown as WorkoutSession;
};

export const deleteWorkoutSession = async (id: string): Promise<void> => {
	const user = await requireUser();

	const { error } = await supabase
		.from('workout_session')
		.delete()
		.eq('id', id)
		.eq('user_id', user.id);

	if (error) {
		throw error;
	}
};
