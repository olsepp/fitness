import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { WorkoutSession, WorkoutType, Exercise } from '$lib/types';

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

const workoutTypesSelect = ['id', 'key', 'name', 'icon'].join(',');
const exercisesSelect = ['id', 'name', 'notes', 'created_at'].join(',');

export const load: PageServerLoad = async ({ params, locals: { supabase, getSession } }) => {
	const session = await getSession();
	if (!session) {
		return {
			workout: null,
			workoutTypes: [],
			availableExercises: []
		};
	}

	// Load workout with ownership check
	const { data: workoutData, error: workoutError } = await supabase
		.from('workout_session')
		.select(sessionSelect)
		.eq('id', params.id)
		.eq('user_id', session.user.id)
		.single();

	if (workoutError || !workoutData) {
		throw error(404, 'Workout not found');
	}

	// Load workout types (shared, no user filter)
	const { data: typesData } = await supabase
		.from('workout_type')
		.select(workoutTypesSelect);

	// Load user's exercises
	const { data: exercisesData } = await supabase
		.from('exercise')
		.select(exercisesSelect)
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: false });

	// Sort exercises and sets by order_index
	const workout = workoutData as unknown as WorkoutSession;
	const sortedExercises = workout.workout_exercise?.sort((a, b) => a.order_index - b.order_index) || [];
	sortedExercises.forEach((exercise) => {
		exercise.workout_set = exercise.workout_set?.sort((a, b) => a.order_index - b.order_index) || [];
	});

	return {
		workout: {
			...workout,
			workout_exercise: sortedExercises
		} as WorkoutSession,
		workoutTypes: (typesData || []) as unknown as WorkoutType[],
		availableExercises: (exercisesData || []) as unknown as Exercise[]
	};
};
