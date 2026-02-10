import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkoutSet } from '$lib/types';
import { requireUser } from '$lib/auth';

type WorkoutSetInsert = {
	workout_exercise_id: string;
	reps: number;
	weight?: number | null;
	order_index: number;
};

type WorkoutSetUpdate = {
	reps?: number;
	weight?: number | null;
	order_index?: number;
};

// Helper to verify user owns the workout exercise (and thus the workout session)
async function verifyExerciseOwnership(
	supabase: SupabaseClient,
	workoutExerciseId: string
): Promise<boolean> {
	const user = await requireUser(supabase);

	// First get the exercise to find its workout_session_id
	const { data: exercise, error: exerciseError } = await supabase
		.from('workout_exercise')
		.select('workout_session_id')
		.eq('id', workoutExerciseId)
		.single();

	if (exerciseError || !exercise) return false;

	// Then verify user owns the workout session
	const { data: session, error: sessionError } = await supabase
		.from('workout_session')
		.select('id')
		.eq('id', exercise.workout_session_id)
		.eq('user_id', user.id)
		.single();

	return !sessionError && !!session;
}

// Helper to verify user owns the workout set
async function verifySetOwnership(supabase: SupabaseClient, setId: string): Promise<boolean> {
	const user = await requireUser(supabase);

	// First get the set to find its workout_exercise_id
	const { data: set, error: setError } = await supabase
		.from('workout_set')
		.select('workout_exercise_id')
		.eq('id', setId)
		.single();

	if (setError || !set) return false;

	// Then verify user owns the workout exercise
	const { data: exercise, error: exerciseError } = await supabase
		.from('workout_exercise')
		.select('workout_session_id')
		.eq('id', set.workout_exercise_id)
		.single();

	if (exerciseError || !exercise) return false;

	// Finally verify user owns the workout session
	const { data: session, error: sessionError } = await supabase
		.from('workout_session')
		.select('id')
		.eq('id', exercise.workout_session_id)
		.eq('user_id', user.id)
		.single();

	return !sessionError && !!session;
}

export const addWorkoutSet = async (
	supabase: SupabaseClient,
	payload: WorkoutSetInsert
): Promise<WorkoutSet> => {
	const user = await requireUser(supabase);

	// Verify user owns the workout exercise
	const isOwner = await verifyExerciseOwnership(supabase, payload.workout_exercise_id);
	if (!isOwner) {
		throw new Error('Not authorized to add sets to this exercise');
	}

	const { data, error } = await supabase
		.from('workout_set')
		.insert({
			workout_exercise_id: payload.workout_exercise_id,
			reps: payload.reps,
			weight: payload.weight ?? null,
			order_index: payload.order_index,
		})
		.select('id,workout_exercise_id,reps,weight,order_index,created_at')
		.single();

	if (error) {
		throw error;
	}

	return data;
};

export const updateWorkoutSet = async (
	supabase: SupabaseClient,
	id: string,
	payload: WorkoutSetUpdate
): Promise<WorkoutSet> => {
	const user = await requireUser(supabase);

	// Verify user owns this set
	const isOwner = await verifySetOwnership(supabase, id);
	if (!isOwner) {
		throw new Error('Not authorized to update this set');
	}

	const { data, error } = await supabase
		.from('workout_set')
		.update({
			...(payload.reps !== undefined ? { reps: payload.reps } : {}),
			...(payload.weight !== undefined ? { weight: payload.weight } : {}),
			...(payload.order_index !== undefined ? { order_index: payload.order_index } : {}),
		})
		.eq('id', id)
		.select('id,workout_exercise_id,reps,weight,order_index,created_at')
		.single();

	if (error) {
		throw error;
	}

	return data;
};

export const deleteWorkoutSet = async (supabase: SupabaseClient, id: string): Promise<void> => {
	const user = await requireUser(supabase);

	// Verify user owns this set
	const isOwner = await verifySetOwnership(supabase, id);
	if (!isOwner) {
		throw new Error('Not authorized to delete this set');
	}

	const { error } = await supabase.from('workout_set').delete().eq('id', id);

	if (error) {
		throw error;
	}
};
