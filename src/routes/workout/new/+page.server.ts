import { fail, redirect, type Actions } from '@sveltejs/kit';
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
		const name = (formData.get('exercise_name') as string | null) ?? '';
		const notes = (formData.get('exercise_notes') as string | null) ?? '';

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
	},
	'create-workout': async ({ request, locals: { supabase, getSession } }) => {
		const session = await getSession();
		const formData = await request.formData();
		const workoutTypeId = (formData.get('workout_type_id') as string | null) ?? '';
		const date = (formData.get('date') as string | null) ?? '';
		const notes = (formData.get('notes') as string | null) ?? '';
		const exercisesRaw = (formData.get('exercises') as string | null) ?? '[]';

		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		if (!workoutTypeId) {
			return fail(400, { error: 'Please select a workout type.' });
		}

		if (!date) {
			return fail(400, { error: 'Workout date is required.' });
		}

		let exercises: Array<{
			exercise_id: string;
			name_snapshot: string;
			notes?: string | null;
			order_index?: number;
			sets: Array<{ reps: number; weight?: number | null; order_index?: number }>;
		}>;

		try {
			exercises = JSON.parse(exercisesRaw);
		} catch (error) {
			return fail(400, { error: 'Invalid exercises payload.' });
		}

		if (!Array.isArray(exercises) || exercises.length === 0) {
			return fail(400, { error: 'Please add at least one exercise.' });
		}

		for (const exercise of exercises) {
			if (!exercise.exercise_id) {
				return fail(400, { error: 'Invalid exercise selection.' });
			}
			if (!exercise.sets || exercise.sets.length === 0) {
				return fail(400, {
					error: `Exercise "${exercise.name_snapshot}" must have at least one set.`
				});
			}
		}

		const { data: sessionData, error: sessionError } = await supabase
			.from('workout_session')
			.insert({
				user_id: session.user.id,
				workout_type_id: workoutTypeId,
				date,
				notes: notes.trim() || null
			})
			.select('id')
			.single();

		if (sessionError || !sessionData) {
			console.error('Error creating workout session:', sessionError);
			return fail(500, { error: sessionError?.message ?? 'Failed to create workout.' });
		}

		for (const [exerciseIndex, exercise] of exercises.entries()) {
			const { data: workoutExercise, error: exerciseError } = await supabase
				.from('workout_exercise')
				.insert({
					workout_session_id: sessionData.id,
					exercise_id: exercise.exercise_id,
					name_snapshot: exercise.name_snapshot,
					order_index: exercise.order_index ?? exerciseIndex,
					notes: exercise.notes ?? null,
					is_completed: false
				})
				.select('id')
				.single();

			if (exerciseError || !workoutExercise) {
				console.error('Error creating workout exercise:', exerciseError);
				return fail(500, { error: exerciseError?.message ?? 'Failed to add workout exercise.' });
			}

			for (const [setIndex, set] of exercise.sets.entries()) {
				const reps = Number(set.reps);
				if (!Number.isFinite(reps) || reps <= 0) {
					return fail(400, { error: 'Invalid reps value.' });
				}

				const { error: setError } = await supabase.from('workout_set').insert({
					workout_exercise_id: workoutExercise.id,
					reps,
					weight: set.weight ?? null,
					order_index: set.order_index ?? setIndex
				});

				if (setError) {
					console.error('Error creating workout set:', setError);
					return fail(500, { error: setError.message ?? 'Failed to add workout set.' });
				}
			}
		}

		throw redirect(303, '/history');
	}
};
