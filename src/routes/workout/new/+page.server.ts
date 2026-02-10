import { fail, type Actions } from '@sveltejs/kit';
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

export const actions: Actions = {
	'create-exercise': async ({ request, locals: { supabase, getSession } }) => {
		const session = await getSession();
		const formData = await request.formData();
		const name = (formData.get('name') as string | null) ?? '';
		const notes = (formData.get('notes') as string | null) ?? '';

		if (!session) {
			return fail(401, {
				error: 'Not authenticated',
				values: { name, notes }
			});
		}

		if (!name.trim()) {
			return fail(400, {
				error: 'Exercise name is required',
				values: { name, notes }
			});
		}

		const { data, error } = await supabase
			.from('exercise')
			.insert({
				name: name.trim(),
				notes: notes.trim() || null,
				user_id: session.user.id
			})
			.select('id,user_id,name,notes,created_at')
			.single();

		if (error) {
			console.error('Error creating exercise:', error);
			return fail(500, {
				error: error.message,
				values: { name, notes }
			});
		}

		return { success: true, exercise: data };
	}
};
