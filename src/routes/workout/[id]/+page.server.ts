import { error, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createRepositories } from '$lib/repositories';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.getSession();
	if (!session) {
		return {
			workout: null,
			workoutTypes: [],
			availableExercises: []
		};
	}

	const repos = createRepositories(event);
	const { params } = event;

	// Load workout with ownership check
	const workout = await repos.workoutSessions.getById(params.id);

	if (!workout) {
		throw error(404, 'Workout not found');
	}

	// Load workout types and exercises in parallel
	try {
		const [workoutTypes, availableExercises] = await Promise.all([
			repos.workoutTypes.list(),
			repos.exercises.list()
		]);

		// Sort exercises and sets by order_index
		const sortedExercises = workout.workout_exercise?.sort((a, b) => a.order_index - b.order_index) || [];
		sortedExercises.forEach((exercise) => {
			exercise.workout_set = exercise.workout_set?.sort((a, b) => a.order_index - b.order_index) || [];
		});

		return {
			workout: {
				...workout,
				workout_exercise: sortedExercises
			},
			workoutTypes,
			availableExercises
		};
	} catch (err) {
		console.error('Error loading workout data:', err);
		throw error(500, 'Failed to load workout data');
	}
};

export const actions: Actions = {
	'add-exercise': async (event) => {
		const session = await event.locals.getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await event.request.formData();
		const workoutId = (formData.get('workout_id') as string | null) ?? '';
		const exerciseId = (formData.get('exercise_id') as string | null) ?? '';
		const nameSnapshot = (formData.get('name_snapshot') as string | null) ?? '';
		const orderIndex = Number(formData.get('order_index') ?? 0);

		if (!workoutId || !exerciseId || !nameSnapshot) {
			return fail(400, { error: 'Missing exercise details.' });
		}

		const repos = createRepositories(event);

		// Verify workout ownership
		const workout = await repos.workoutSessions.getById(workoutId);
		if (!workout) {
			return fail(403, { error: 'Not authorized to modify this workout.' });
		}

		try {
			const workoutExercise = await repos.workoutExercises.add({
				workout_session_id: workoutId,
				exercise_id: exerciseId,
				name_snapshot: nameSnapshot,
				order_index: Number.isFinite(orderIndex) ? orderIndex : 0,
				notes: null
			});

			return { success: true, workoutExercise };
		} catch (err) {
			console.error('Error adding exercise:', err);
			return fail(500, { error: 'Failed to add exercise.' });
		}
	},

	'create-exercise': async (event) => {
		const session = await event.locals.getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await event.request.formData();
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

		const repos = createRepositories(event);

		// Verify workout ownership
		const workout = await repos.workoutSessions.getById(workoutId);
		if (!workout) {
			return fail(403, { error: 'Not authorized to modify this workout.' });
		}

		try {
			// Create the exercise
			const exercise = await repos.exercises.create({
				name: name.trim(),
				notes: notes.trim() || null
			});

			// Add to workout
			const workoutExercise = await repos.workoutExercises.add({
				workout_session_id: workoutId,
				exercise_id: exercise.id,
				name_snapshot: exercise.name,
				order_index: Number.isFinite(orderIndex) ? orderIndex : 0,
				notes: null
			});

			return { success: true, exercise, workoutExercise };
		} catch (err) {
			console.error('Error creating exercise:', err);
			return fail(500, { error: 'Failed to create exercise.' });
		}
	},

	'add-set': async (event) => {
		const session = await event.locals.getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await event.request.formData();
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

		const repos = createRepositories(event);

		try {
			const set = await repos.workoutSets.add({
				workout_exercise_id: workoutExerciseId,
				reps,
				weight: Number.isFinite(weight) ? weight : null,
				order_index: Number.isFinite(orderIndex) ? orderIndex : 0
			});

			return { success: true, set };
		} catch (err) {
			console.error('Error adding set:', err);
			return fail(500, { error: 'Failed to add set.' });
		}
	},

	'update-set': async (event) => {
		const session = await event.locals.getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await event.request.formData();
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

		const repos = createRepositories(event);

		try {
			const set = await repos.workoutSets.update(setId, {
				reps,
				weight: Number.isFinite(weight) ? weight : null
			});

			return { success: true, set };
		} catch (err) {
			console.error('Error updating set:', err);
			return fail(500, { error: 'Failed to update set.' });
		}
	},

	'toggle-workout-complete': async (event) => {
		const session = await event.locals.getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await event.request.formData();
		const workoutId = (formData.get('workout_id') as string | null) ?? '';
		const isCompleted = formData.get('is_completed') === 'true';

		if (!workoutId) {
			return fail(400, { error: 'Missing workout id.' });
		}

		const repos = createRepositories(event);

		try {
			const workout = await repos.workoutSessions.toggleComplete(workoutId, isCompleted);
			return { success: true, workout };
		} catch (err) {
			console.error('Error toggling workout completion:', err);
			return fail(500, { error: 'Failed to update workout.' });
		}
	},

	'toggle-exercise-complete': async (event) => {
		const session = await event.locals.getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await event.request.formData();
		const workoutExerciseId = (formData.get('workout_exercise_id') as string | null) ?? '';
		const isCompleted = formData.get('is_completed') === 'true';

		if (!workoutExerciseId) {
			return fail(400, { error: 'Missing workout exercise id.' });
		}

		const repos = createRepositories(event);

		try {
			const workoutExercise = await repos.workoutExercises.toggleComplete(workoutExerciseId, isCompleted);
			return { success: true, workoutExercise };
		} catch (err) {
			console.error('Error toggling exercise completion:', err);
			return fail(500, { error: 'Failed to update exercise.' });
		}
	},

	'save-workout': async (event) => {
		const session = await event.locals.getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await event.request.formData();
		const workoutId = (formData.get('workout_id') as string | null) ?? '';
		const workoutTypeId = (formData.get('workout_type_id') as string | null) ?? '';
		const date = (formData.get('date') as string | null) ?? '';
		const notes = (formData.get('notes') as string | null) ?? '';
		const removedExerciseIdsRaw = (formData.get('removed_exercise_ids') as string | null) ?? '[]';
		const removedSetIdsRaw = (formData.get('removed_set_ids') as string | null) ?? '[]';

		if (!workoutId) {
			return fail(400, { error: 'Missing workout id.' });
		}

		const repos = createRepositories(event);

		// Verify workout ownership
		const workout = await repos.workoutSessions.getById(workoutId);
		if (!workout) {
			return fail(403, { error: 'Not authorized to modify this workout.' });
		}

		let removedExerciseIds: string[] = [];
		let removedSetIds: string[] = [];
		try {
			removedExerciseIds = JSON.parse(removedExerciseIdsRaw);
			removedSetIds = JSON.parse(removedSetIdsRaw);
		} catch {
			return fail(400, { error: 'Invalid removal payload.' });
		}

		try {
			// Delete removed sets
			if (Array.isArray(removedSetIds) && removedSetIds.length > 0) {
				await repos.workoutSets.deleteMany(removedSetIds);
			}

			// Delete removed exercises
			if (Array.isArray(removedExerciseIds) && removedExerciseIds.length > 0) {
				await repos.workoutExercises.deleteMany(removedExerciseIds);
			}

			// Update workout session
			await repos.workoutSessions.update(workoutId, {
				workout_type_id: workoutTypeId,
				date,
				notes: notes.trim() || null
			});

			return { success: true };
		} catch (err) {
			console.error('Error saving workout:', err);
			return fail(500, { error: 'Failed to save workout.' });
		}
	}
};
