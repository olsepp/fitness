import type { PageServerLoad } from './$types';
import type { WorkoutType, Exercise } from '$lib/types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
	const session = await getSession();
	if (!session) {
		return { workoutTypes: [], exercises: [] };
	}

	const [typesResult, exercisesResult] = await Promise.all([
		supabase
			.from('workout_type')
			.select('id,key,name,icon')
			.order('name', { ascending: true }),
		supabase
			.from('exercise')
			.select('id,name,notes,created_at')
			.eq('user_id', session.user.id)
			.order('created_at', { ascending: false }),
	]);

	if (typesResult.error) {
		console.error('Error loading workout types:', typesResult.error);
	}
	if (exercisesResult.error) {
		console.error('Error loading exercises:', exercisesResult.error);
	}

	return {
		workoutTypes: (typesResult.data ?? []) as WorkoutType[],
		exercises: (exercisesResult.data ?? []) as Exercise[],
	};
};
