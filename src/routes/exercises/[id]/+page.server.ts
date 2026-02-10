import { redirect, type Actions } from '@sveltejs/kit';
import type { Exercise } from '$lib/types';

const userExercisesSelect = ['id', 'user_id', 'name', 'notes', 'created_at'].join(',');

export const load = async ({ params: { id }, locals: { supabase, getSession } }) => {
	const session = await getSession();
	if (!session) {
		return { exercise: null };
	}

	const { data, error } = await supabase
		.from('exercise')
		.select(userExercisesSelect)
		.eq('id', id)
		.eq('user_id', session.user.id)
		.single();

	if (error || !data) {
		return { exercise: null };
	}

	return { exercise: data as Exercise };
};

export const actions: Actions = {
	update: async ({ request, params: { id }, locals: { supabase, getSession } }) => {
		const session = await getSession();
		if (!session) {
			return { success: false, error: 'Not authenticated' };
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const notes = formData.get('notes') as string | null;

		if (!name || !name.trim()) {
			return { success: false, error: 'Exercise name is required' };
		}

		const { data, error } = await supabase
			.from('exercise')
			.update({
				name: name.trim(),
				notes: notes?.trim() || null
			})
			.eq('id', id)
			.eq('user_id', session.user.id)
			.select('id,user_id,name,notes,created_at')
			.single();

		if (error) {
			console.error('Error updating exercise:', error);
			return { success: false, error: error.message };
		}

		return { success: true, exercise: data };
	},

	delete: async ({ params: { id }, locals: { supabase, getSession } }) => {
		const session = await getSession();
		if (!session) {
			return { success: false, error: 'Not authenticated' };
		}

		const { error } = await supabase
			.from('exercise')
			.delete()
			.eq('id', id)
			.eq('user_id', session.user.id);

		if (error) {
			console.error('Error deleting exercise:', error);
			return { success: false, error: error.message };
		}

		throw redirect(303, '/exercises');
	}
};
