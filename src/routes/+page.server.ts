import type { PageServerLoad } from './$types';
import { createRepositories } from '$lib/repositories';

export const load: PageServerLoad = async (event) => {
	// Auth is already enforced by the hook for protected routes.
	// No need to call getSession() again here.
	const repos = createRepositories(event);

	try {
		const workouts = await repos.workoutSessions.list();
		return { workouts };
	} catch (error) {
		console.error('Error loading workouts:', error);
		return { workouts: [] };
	}
};
