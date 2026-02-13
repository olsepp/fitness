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
