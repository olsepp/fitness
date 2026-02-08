import { supabase } from '$lib/supabaseClient';
import type { WorkoutExercise } from '$lib/types';
import { requireUser } from '$lib/auth';

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

const exerciseSelect = [
	'id',
	'workout_session_id',
	'exercise_id',
	'name_snapshot',
	'notes',
	'is_completed',
	'order_index',
	'created_at',
	'workout_set(id,workout_exercise_id,reps,weight,order_index,created_at)',
].join(',');

// Helper to verify user owns the workout session
async function verifyWorkoutOwnership(workoutSessionId: string): Promise<boolean> {
	const user = await requireUser();

	const { data, error } = await supabase
		.from('workout_session')
		.select('id')
		.eq('id', workoutSessionId)
		.eq('user_id', user.id)
		.single();

	return !error && !!data;
}

// Helper to verify user owns the workout exercise
async function verifyExerciseOwnership(exerciseId: string): Promise<boolean> {
	const user = await requireUser();

	// First get the exercise to find its workout_session_id
	const { data: exercise, error: exerciseError } = await supabase
		.from('workout_exercise')
		.select('workout_session_id')
		.eq('id', exerciseId)
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

export const addWorkoutExercise = async (
	payload: WorkoutExerciseInsert,
): Promise<WorkoutExercise> => {
	const user = await requireUser();

	// Verify user owns the workout session
	const isOwner = await verifyWorkoutOwnership(payload.workout_session_id);
	if (!isOwner) {
		throw new Error('Not authorized to add exercises to this workout');
	}

	const { data, error } = await supabase
		.from('workout_exercise')
		.insert({
			workout_session_id: payload.workout_session_id,
			exercise_id: payload.exercise_id,
			name_snapshot: payload.name_snapshot,
			order_index: payload.order_index,
			notes: payload.notes ?? null,
			is_completed: false,
		})
		.select(exerciseSelect)
		.single();

	if (error) {
		throw error;
	}

	return data as unknown as WorkoutExercise;
};

export const updateWorkoutExercise = async (
	id: string,
	payload: WorkoutExerciseUpdate,
): Promise<WorkoutExercise> => {
	const user = await requireUser();

	// Verify user owns this exercise
	const isOwner = await verifyExerciseOwnership(id);
	if (!isOwner) {
		throw new Error('Not authorized to update this exercise');
	}

	const { data, error } = await supabase
		.from('workout_exercise')
		.update({
			...(payload.name_snapshot !== undefined ? { name_snapshot: payload.name_snapshot } : {}),
			...(payload.notes !== undefined ? { notes: payload.notes } : {}),
			...(payload.is_completed !== undefined ? { is_completed: payload.is_completed } : {}),
			...(payload.order_index !== undefined ? { order_index: payload.order_index } : {}),
		})
		.eq('id', id)
		.select(exerciseSelect)
		.single();

	if (error) {
		throw error;
	}

	return data as unknown as WorkoutExercise;
};

export const deleteWorkoutExercise = async (id: string): Promise<void> => {
	const user = await requireUser();

	// Verify user owns this exercise
	const isOwner = await verifyExerciseOwnership(id);
	if (!isOwner) {
		throw new Error('Not authorized to delete this exercise');
	}

	const { error } = await supabase
		.from('workout_exercise')
		.delete()
		.eq('id', id);

	if (error) {
		throw error;
	}
};

export const toggleExerciseCompletion = async (
	id: string,
	isCompleted: boolean
): Promise<WorkoutExercise> => {
	return updateWorkoutExercise(id, { is_completed: isCompleted });
};
