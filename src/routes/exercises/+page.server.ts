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
