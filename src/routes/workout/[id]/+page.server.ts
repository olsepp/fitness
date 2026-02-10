import { error, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { WorkoutSession, WorkoutType, Exercise } from '$lib/types';

const sessionSelect = [
	'id',
	'workout_type_id',
	'date',
	'notes',
	'is_completed',
	'created_at',
	'workout_type(id,key,name,icon)',
	'workout_exercise(id,workout_session_id,exercise_id,name_snapshot,notes,is_completed,order_index,created_at,workout_set(id,workout_exercise_id,reps,weight,order_index,created_at))',
].join(',');

const workoutTypesSelect = ['id', 'key', 'name', 'icon'].join(',');
const exercisesSelect = ['id', 'name', 'notes', 'created_at'].join(',');

export const load: PageServerLoad = async ({ params, locals: { supabase, getSession } }) => {
	const session = await getSession();
	if (!session) {
		return {
			workout: null,
			workoutTypes: [],
			availableExercises: []
		};
	}

	// Load workout with ownership check
	const { data: workoutData, error: workoutError } = await supabase
		.from('workout_session')
		.select(sessionSelect)
		.eq('id', params.id)
		.eq('user_id', session.user.id)
		.single();

	if (workoutError || !workoutData) {
		throw error(404, 'Workout not found');
	}

	// Load workout types (shared, no user filter)
	const { data: typesData } = await supabase
		.from('workout_type')
		.select(workoutTypesSelect);

	// Load user's exercises
	const { data: exercisesData } = await supabase
		.from('exercise')
		.select(exercisesSelect)
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: false });

	// Sort exercises and sets by order_index
	const workout = workoutData as unknown as WorkoutSession;
	const sortedExercises = workout.workout_exercise?.sort((a, b) => a.order_index - b.order_index) || [];
	sortedExercises.forEach((exercise) => {
		exercise.workout_set = exercise.workout_set?.sort((a, b) => a.order_index - b.order_index) || [];
	});

	return {
		workout: {
			...workout,
			workout_exercise: sortedExercises
		} as WorkoutSession,
		workoutTypes: (typesData || []) as unknown as WorkoutType[],
		availableExercises: (exercisesData || []) as unknown as Exercise[]
	};
};

export const actions: Actions = {
	'add-exercise': async ({ request, locals: { supabase, getSession } }) => {
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const workoutId = (formData.get('workout_id') as string | null) ?? '';
		const exerciseId = (formData.get('exercise_id') as string | null) ?? '';
		const nameSnapshot = (formData.get('name_snapshot') as string | null) ?? '';
		const orderIndex = Number(formData.get('order_index') ?? 0);

		if (!workoutId || !exerciseId || !nameSnapshot) {
			return fail(400, { error: 'Missing exercise details.' });
		}

		const { data: workout, error: workoutError } = await supabase
			.from('workout_session')
			.select('id')
			.eq('id', workoutId)
			.eq('user_id', session.user.id)
			.single();

		if (workoutError || !workout) {
			return fail(403, { error: 'Not authorized to modify this workout.' });
		}

		const { data, error: insertError } = await supabase
			.from('workout_exercise')
			.insert({
				workout_session_id: workoutId,
				exercise_id: exerciseId,
				name_snapshot: nameSnapshot,
				order_index: Number.isFinite(orderIndex) ? orderIndex : 0,
				notes: null,
				is_completed: false
			})
			.select('id,workout_session_id,exercise_id,name_snapshot,notes,is_completed,order_index,created_at,workout_set(id,workout_exercise_id,reps,weight,order_index,created_at)')
			.single();

		if (insertError || !data) {
			console.error('Error adding exercise:', insertError);
			return fail(500, { error: insertError?.message ?? 'Failed to add exercise.' });
		}

		return { success: true, workoutExercise: data };
	},
	'create-exercise': async ({ request, locals: { supabase, getSession } }) => {
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const workoutId = (formData.get('workout_id') as string | null) ?? '';
		const name = (formData.get('name') as string | null) ?? '';
		const notes = (formData.get('notes') as string | null) ?? '';
		const orderIndex = Number(formData.get('order_index') ?? 0);

		if (!workoutId) {
			return fail(400, { error: 'Missing workout id.' });
		}

		if (!name.trim()) {
			return fail(400, { error: 'Exercise name is required.' });
		}

		const { data: workout, error: workoutError } = await supabase
			.from('workout_session')
			.select('id')
			.eq('id', workoutId)
			.eq('user_id', session.user.id)
			.single();

		if (workoutError || !workout) {
			return fail(403, { error: 'Not authorized to modify this workout.' });
		}

		const { data: exercise, error: exerciseError } = await supabase
			.from('exercise')
			.insert({
				name: name.trim(),
				notes: notes.trim() || null,
				user_id: session.user.id
			})
			.select('id,user_id,name,notes,created_at')
			.single();

		if (exerciseError || !exercise) {
			console.error('Error creating exercise:', exerciseError);
			return fail(500, { error: exerciseError?.message ?? 'Failed to create exercise.' });
		}

		const { data: workoutExercise, error: workoutExerciseError } = await supabase
			.from('workout_exercise')
			.insert({
				workout_session_id: workoutId,
				exercise_id: exercise.id,
				name_snapshot: exercise.name,
				order_index: Number.isFinite(orderIndex) ? orderIndex : 0,
				notes: null,
				is_completed: false
			})
			.select('id,workout_session_id,exercise_id,name_snapshot,notes,is_completed,order_index,created_at,workout_set(id,workout_exercise_id,reps,weight,order_index,created_at)')
			.single();

		if (workoutExerciseError || !workoutExercise) {
			console.error('Error creating workout exercise:', workoutExerciseError);
			return fail(500, { error: workoutExerciseError?.message ?? 'Failed to add exercise to workout.' });
		}

		return { success: true, exercise, workoutExercise };
	},
	'add-set': async ({ request, locals: { supabase, getSession } }) => {
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const workoutExerciseId = (formData.get('workout_exercise_id') as string | null) ?? '';
		const reps = Number(formData.get('reps') ?? 0);
		const weightRaw = formData.get('weight');
		const orderIndex = Number(formData.get('order_index') ?? 0);

		if (!workoutExerciseId) {
			return fail(400, { error: 'Missing workout exercise id.' });
		}
		if (!Number.isFinite(reps) || reps <= 0) {
			return fail(400, { error: 'Invalid reps value.' });
		}
		const weight = weightRaw === null || weightRaw === '' ? null : Number(weightRaw);

		const { data: exerciseOwner, error: exerciseOwnerError } = await supabase
			.from('workout_exercise')
			.select('workout_session_id')
			.eq('id', workoutExerciseId)
			.single();

		if (exerciseOwnerError || !exerciseOwner) {
			return fail(404, { error: 'Workout exercise not found.' });
		}

		const { data: sessionOwner } = await supabase
			.from('workout_session')
			.select('id')
			.eq('id', exerciseOwner.workout_session_id)
			.eq('user_id', session.user.id)
			.single();

		if (!sessionOwner) {
			return fail(403, { error: 'Not authorized to modify this workout.' });
		}

		const { data: set, error: setError } = await supabase
			.from('workout_set')
			.insert({
				workout_exercise_id: workoutExerciseId,
				reps,
				weight: Number.isFinite(weight) ? weight : null,
				order_index: Number.isFinite(orderIndex) ? orderIndex : 0
			})
			.select('id,workout_exercise_id,reps,weight,order_index,created_at')
			.single();

		if (setError || !set) {
			console.error('Error adding workout set:', setError);
			return fail(500, { error: setError?.message ?? 'Failed to add set.' });
		}

		return { success: true, set };
	},
	'update-set': async ({ request, locals: { supabase, getSession } }) => {
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const setId = (formData.get('set_id') as string | null) ?? '';
		const reps = Number(formData.get('reps') ?? 0);
		const weightRaw = formData.get('weight');

		if (!setId) {
			return fail(400, { error: 'Missing set id.' });
		}
		if (!Number.isFinite(reps) || reps <= 0) {
			return fail(400, { error: 'Invalid reps value.' });
		}
		const weight = weightRaw === null || weightRaw === '' ? null : Number(weightRaw);

		const { data: setOwner, error: setOwnerError } = await supabase
			.from('workout_set')
			.select('workout_exercise_id')
			.eq('id', setId)
			.single();

		if (setOwnerError || !setOwner) {
			return fail(404, { error: 'Workout set not found.' });
		}

		const { data: exerciseOwner } = await supabase
			.from('workout_exercise')
			.select('workout_session_id')
			.eq('id', setOwner.workout_exercise_id)
			.single();

		if (!exerciseOwner) {
			return fail(404, { error: 'Workout exercise not found.' });
		}

		const { data: sessionOwner } = await supabase
			.from('workout_session')
			.select('id')
			.eq('id', exerciseOwner.workout_session_id)
			.eq('user_id', session.user.id)
			.single();

		if (!sessionOwner) {
			return fail(403, { error: 'Not authorized to modify this workout.' });
		}

		const { data: updatedSet, error: updateError } = await supabase
			.from('workout_set')
			.update({
				reps,
				weight: Number.isFinite(weight) ? weight : null
			})
			.eq('id', setId)
			.select('id,workout_exercise_id,reps,weight,order_index,created_at')
			.single();

		if (updateError || !updatedSet) {
			return fail(500, { error: updateError?.message ?? 'Failed to update set.' });
		}

		return { success: true, set: updatedSet };
	},
	'toggle-workout-complete': async ({ request, locals: { supabase, getSession } }) => {
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}
		const formData = await request.formData();
		const workoutId = (formData.get('workout_id') as string | null) ?? '';
		const isCompleted = formData.get('is_completed') === 'true';

		if (!workoutId) {
			return fail(400, { error: 'Missing workout id.' });
		}

		const { data: workout, error: workoutError } = await supabase
			.from('workout_session')
			.update({ is_completed: isCompleted })
			.eq('id', workoutId)
			.eq('user_id', session.user.id)
			.select('id,is_completed')
			.single();

		if (workoutError || !workout) {
			return fail(500, { error: workoutError?.message ?? 'Failed to update workout.' });
		}

		return { success: true, workout };
	},
	'toggle-exercise-complete': async ({ request, locals: { supabase, getSession } }) => {
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}
		const formData = await request.formData();
		const workoutExerciseId = (formData.get('workout_exercise_id') as string | null) ?? '';
		const isCompleted = formData.get('is_completed') === 'true';

		if (!workoutExerciseId) {
			return fail(400, { error: 'Missing workout exercise id.' });
		}

		const { data: exerciseOwner, error: exerciseOwnerError } = await supabase
			.from('workout_exercise')
			.select('workout_session_id')
			.eq('id', workoutExerciseId)
			.single();

		if (exerciseOwnerError || !exerciseOwner) {
			return fail(404, { error: 'Workout exercise not found.' });
		}

		const { data: sessionOwner } = await supabase
			.from('workout_session')
			.select('id')
			.eq('id', exerciseOwner.workout_session_id)
			.eq('user_id', session.user.id)
			.single();

		if (!sessionOwner) {
			return fail(403, { error: 'Not authorized to modify this workout.' });
		}

		const { data: updatedExercise, error: updateError } = await supabase
			.from('workout_exercise')
			.update({ is_completed: isCompleted })
			.eq('id', workoutExerciseId)
			.select('id,is_completed')
			.single();

		if (updateError || !updatedExercise) {
			return fail(500, { error: updateError?.message ?? 'Failed to update exercise.' });
		}

		return { success: true, workoutExercise: updatedExercise };
	},
	'save-workout': async ({ request, locals: { supabase, getSession } }) => {
		const session = await getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}
		const formData = await request.formData();
		const workoutId = (formData.get('workout_id') as string | null) ?? '';
		const workoutTypeId = (formData.get('workout_type_id') as string | null) ?? '';
		const date = (formData.get('date') as string | null) ?? '';
		const notes = (formData.get('notes') as string | null) ?? '';
		const removedExerciseIdsRaw = (formData.get('removed_exercise_ids') as string | null) ?? '[]';
		const removedSetIdsRaw = (formData.get('removed_set_ids') as string | null) ?? '[]';

		if (!workoutId) {
			return fail(400, { error: 'Missing workout id.' });
		}

		const { data: workoutOwner } = await supabase
			.from('workout_session')
			.select('id')
			.eq('id', workoutId)
			.eq('user_id', session.user.id)
			.single();

		if (!workoutOwner) {
			return fail(403, { error: 'Not authorized to modify this workout.' });
		}

		let removedExerciseIds: string[] = [];
		let removedSetIds: string[] = [];
		try {
			removedExerciseIds = JSON.parse(removedExerciseIdsRaw);
			removedSetIds = JSON.parse(removedSetIdsRaw);
		} catch (error) {
			return fail(400, { error: 'Invalid removal payload.' });
		}

		if (Array.isArray(removedSetIds) && removedSetIds.length > 0) {
			const { error: deleteSetError } = await supabase
				.from('workout_set')
				.delete()
				.in('id', removedSetIds);

			if (deleteSetError) {
				return fail(500, { error: deleteSetError.message ?? 'Failed to delete sets.' });
			}
		}

		if (Array.isArray(removedExerciseIds) && removedExerciseIds.length > 0) {
			const { error: deleteExerciseError } = await supabase
				.from('workout_exercise')
				.delete()
				.in('id', removedExerciseIds);

			if (deleteExerciseError) {
				return fail(500, { error: deleteExerciseError.message ?? 'Failed to delete exercises.' });
			}
		}

		const { error: updateError } = await supabase
			.from('workout_session')
			.update({
				workout_type_id: workoutTypeId,
				date,
				notes: notes.trim() || null
			})
			.eq('id', workoutId)
			.eq('user_id', session.user.id);

		if (updateError) {
			return fail(500, { error: updateError.message ?? 'Failed to save workout.' });
		}

		return { success: true };
	}
};
