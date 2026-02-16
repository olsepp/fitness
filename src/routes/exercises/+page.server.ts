import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createRepositories } from '$lib/repositories';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.getSession();
	if (!session) {
		return { exercises: [] };
	}

	const repos = createRepositories(event);

	try {
		const exercises = await repos.exercises.list();
		return { exercises };
	} catch (error) {
		console.error('Error loading exercises:', error);
		return { exercises: [] };
	}
};

export const actions: Actions = {
	create: async (event) => {
		const session = await event.locals.getSession();
		const formData = await event.request.formData();
		const name = (formData.get('name') as string | null) ?? '';
		const notes = (formData.get('notes') as string | null) ?? '';
		const exerciseTypeRaw = (formData.get('exercise_type') as string | null) ?? 'strength';

		const validTypes = ['strength', 'cardio'];
		const exerciseType = validTypes.includes(exerciseTypeRaw || '') ? exerciseTypeRaw as 'strength' | 'cardio' : 'strength';

		if (!session) {
			return fail(401, {
				error: 'Not authenticated',
				action: 'create',
				values: { name, notes }
			});
		}

		if (!name.trim()) {
			return fail(400, {
				error: 'Exercise name is required',
				action: 'create',
				values: { name, notes }
			});
		}

		const repos = createRepositories(event);

		try {
			const exercise = await repos.exercises.create({
				name: name.trim(),
				notes: notes.trim() || null,
				exercise_type: exerciseType
			});

			return { success: true, action: 'create', exercise };
		} catch (error) {
			console.error('Error creating exercise:', error);
			return fail(500, {
				error: 'Failed to create exercise',
				action: 'create',
				values: { name, notes }
			});
		}
	},

	delete: async (event) => {
		const session = await event.locals.getSession();
		const formData = await event.request.formData();
		const id = (formData.get('id') as string | null) ?? '';

		if (!session) {
			return fail(401, { error: 'Not authenticated', action: 'delete', id });
		}

		if (!id) {
			return fail(400, { error: 'Exercise id is required', action: 'delete' });
		}

		const repos = createRepositories(event);

		try {
			await repos.exercises.delete(id);
			return { success: true, action: 'delete', id };
		} catch (error) {
			console.error('Error deleting exercise:', error);
			return fail(500, { error: 'Failed to delete exercise', action: 'delete', id });
		}
	}
};
