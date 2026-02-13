import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createRepositories } from '$lib/repositories';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.getSession();
	if (!session) {
		return { exercise: null };
	}

	const { id } = event.params;
	if (!id) {
		return { exercise: null };
	}

	const repos = createRepositories(event);
	const exercise = await repos.exercises.getById(id);

	return { exercise };
};

export const actions: Actions = {
	update: async (event) => {
		const session = await event.locals.getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated', action: 'update' });
		}

		const { id } = event.params;
		if (!id) {
			return fail(400, { error: 'Missing exercise id', action: 'update' });
		}

		const formData = await event.request.formData();
		const name = formData.get('name') as string;
		const notes = formData.get('notes') as string | null;

		if (!name || !name.trim()) {
			return fail(400, {
				error: 'Exercise name is required',
				action: 'update',
				values: {
					name: name ?? '',
					notes: notes ?? ''
				}
			});
		}

		const repos = createRepositories(event);

		try {
			await repos.exercises.update(id, {
				name: name.trim(),
				notes: notes?.trim() || null
			});

			throw redirect(303, '/exercises');
		} catch (err) {
			// Re-throw redirects - check for status property that indicates a redirect
			if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
				throw err;
			}
			console.error('Error updating exercise:', err);
			return fail(500, {
				error: 'Failed to update exercise',
				action: 'update',
				values: {
					name: name.trim(),
					notes: notes?.trim() || ''
				}
			});
		}
	},

	delete: async (event) => {
		const session = await event.locals.getSession();
		if (!session) {
			return { success: false, error: 'Not authenticated' };
		}

		const { id } = event.params;
		if (!id) {
			return { success: false, error: 'Missing exercise id' };
		}

		const repos = createRepositories(event);

		try {
			await repos.exercises.delete(id);
			throw redirect(303, '/exercises');
		} catch (err) {
			// Re-throw redirects - check for status property that indicates a redirect
			if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
				throw err;
			}
			console.error('Error deleting exercise:', err);
			return { success: false, error: 'Failed to delete exercise' };
		}
	}
};
