import { fail, type Actions, type PageServerLoad } from '@sveltejs/kit';
import type { WorkoutSession } from '$lib/types';

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

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
	const session = await getSession();
	if (!session) {
		return { workouts: [] };
	}

	const { data, error } = await supabase
		.from('workout_session')
		.select(sessionSelect)
		.eq('user_id', session.user.id)
		.order('date', { ascending: false })
		.order('order_index', { referencedTable: 'workout_exercise', ascending: true })
		.order('order_index', { referencedTable: 'workout_exercise.workout_set', ascending: true });

	if (error) {
		console.error('Error loading workouts:', error);
		return { workouts: [] };
	}

	return { workouts: (data ?? []) as unknown as WorkoutSession[] };
};

export const actions: Actions = {
	'toggle-complete': async ({ request, locals: { supabase, getSession } }) => {
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const workoutId = (formData.get('workout_id') as string | null) ?? '';
		const isCompleted = formData.get('is_completed') === 'true';

		if (!workoutId) {
			return fail(400, { error: 'Missing workout id.' });
		}

		const { data, error } = await supabase
			.from('workout_session')
			.update({ is_completed: isCompleted })
			.eq('id', workoutId)
			.eq('user_id', session.user.id)
			.select('id,is_completed')
			.single();

		if (error || !data) {
			return fail(500, { error: error?.message ?? 'Failed to update workout.' });
		}

		return { success: true, workout: data };
	}
};
