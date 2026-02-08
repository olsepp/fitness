import { supabase } from '$lib/supabaseClient';
import type { WorkoutType } from '$lib/types';

export const listWorkoutTypes = async (): Promise<WorkoutType[]> => {
	const { data, error } = await supabase
		.from('workout_type')
		.select('id,key,name,icon')
		.order('name', { ascending: true });

	if (error) {
		throw error;
	}

	return data ?? [];
};
