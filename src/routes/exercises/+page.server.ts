import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Exercise } from '$lib/types';

const exercisesSelect = ['id', 'name', 'notes', 'created_at'].join(',');

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
	const session = await getSession();
	if (!session) {
		return { exercises: [] };
	}

	const { data, error } = await supabase
		.from('exercise')
		.select(exercisesSelect)
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error loading exercises:', error);
		return { exercises: [] };
	}

	return { exercises: (data || []) as unknown as Exercise[] };
};

export const actions: Actions = {
	create: async ({ request, locals: { supabase, getSession } }) => {
		const session = await getSession();
		const formData = await request.formData();
		const name = (formData.get('name') as string | null) ?? '';
		const notes = (formData.get('notes') as string | null) ?? '';

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
				action: 'create',
				values: { name, notes }
			});
		}

		return { success: true, action: 'create', exercise: data };
	},

	delete: async ({ request, locals: { supabase, getSession } }) => {
		const session = await getSession();
		const formData = await request.formData();
		const id = (formData.get('id') as string | null) ?? '';

		if (!session) {
			return fail(401, { error: 'Not authenticated', action: 'delete', id });
		}

		if (!id) {
			return fail(400, { error: 'Exercise id is required', action: 'delete' });
		}

		const { error } = await supabase
			.from('exercise')
			.delete()
			.eq('id', id)
			.eq('user_id', session.user.id);

		if (error) {
			console.error('Error deleting exercise:', error);
			return fail(500, { error: error.message, action: 'delete', id });
		}

		return { success: true, action: 'delete', id };
	}
};
