import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createRepositories } from '$lib/repositories';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.getSession();
	if (!session) {
		return { workouts: [] };
	}

	const repos = createRepositories(event);

	try {
		const workouts = await repos.workoutSessions.list();
		return { workouts };
	} catch (error) {
		console.error('Error loading workouts:', error);
		return { workouts: [] };
	}
};

export const actions: Actions = {
	'toggle-complete': async (event) => {
		const session = await event.locals.getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await event.request.formData();
		const workoutId = (formData.get('workout_id') as string | null) ?? '';
		const isCompleted = formData.get('is_completed') === 'true';

		if (!workoutId) {
			return fail(400, { error: 'Missing workout id.' });
		}

		const repos = createRepositories(event);

		try {
			const workout = await repos.workoutSessions.toggleComplete(workoutId, isCompleted);
			return { success: true, workout };
		} catch (error) {
			console.error('Error toggling workout completion:', error);
			return fail(500, { error: 'Failed to update workout.' });
		}
	}
};
