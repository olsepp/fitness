import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createRepositories } from '$lib/repositories';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.getSession();
	if (!session) {
		return { workoutTypes: [], exercises: [] };
	}

	const repos = createRepositories(event);

	try {
		const [workoutTypes, exercises] = await Promise.all([
			repos.workoutTypes.list(),
			repos.exercises.list()
		]);

		return { workoutTypes, exercises };
	} catch (error) {
		console.error('Error loading workout data:', error);
		return { workoutTypes: [], exercises: [] };
	}
};

export const actions: Actions = {
	'create-exercise': async (event) => {
		const session = await event.locals.getSession();
		const formData = await event.request.formData();
		const name = (formData.get('exercise_name') as string | null) ?? '';
		const notes = (formData.get('exercise_notes') as string | null) ?? '';
		const exerciseTypeRaw = (formData.get('exercise_type') as string | null) ?? 'strength';

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

		const validTypes = ['strength', 'cardio'];
		const exerciseType = validTypes.includes(exerciseTypeRaw || '') ? exerciseTypeRaw as 'strength' | 'cardio' : 'strength';

		const repos = createRepositories(event);

		try {
			const exercise = await repos.exercises.create({
				name: name.trim(),
				notes: notes.trim() || null,
				exercise_type: exerciseType
			});

			return { success: true, exercise };
		} catch (error) {
			console.error('Error creating exercise:', error);
			return fail(500, {
				error: 'Failed to create exercise',
				values: { name, notes }
			});
		}
	},

	'create-workout': async (event) => {
		const session = await event.locals.getSession();
		const formData = await event.request.formData();
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
			sets: Array<{ reps: number; weight?: number | null; calories?: number | null; distance?: number | null; order_index?: number }>;
		}>;

		try {
			exercises = JSON.parse(exercisesRaw);
		} catch {
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

		const repos = createRepositories(event);

		try {
			// Create the workout session
			const workoutSession = await repos.workoutSessions.create({
				workout_type_id: workoutTypeId,
				date,
				notes: notes.trim() || null
			});

			// Add exercises and sets
			for (const [exerciseIndex, exercise] of exercises.entries()) {
				const workoutExercise = await repos.workoutExercises.add({
					workout_session_id: workoutSession.id,
					exercise_id: exercise.exercise_id,
					name_snapshot: exercise.name_snapshot,
					order_index: exercise.order_index ?? exerciseIndex,
					notes: exercise.notes ?? null
				});

				for (const [setIndex, set] of exercise.sets.entries()) {
					const reps = Number(set.reps);
					const calories = typeof set.calories === 'number' ? set.calories : null;
					const distance = typeof set.distance === 'number' ? set.distance : null;

					// For strength: reps required. For cardio: calories or distance required.
					const isCardio = calories !== null || distance !== null;

					if (!isCardio && (!Number.isFinite(reps) || reps <= 0)) {
						return fail(400, { error: `Invalid reps value for "${exercise.name_snapshot}".` });
					}

					if (isCardio && calories === null && distance === null) {
						return fail(400, { error: `Please enter calories or distance for "${exercise.name_snapshot}".` });
					}

					await repos.workoutSets.add({
						workout_exercise_id: workoutExercise.id,
						reps: isCardio ? 0 : reps,
						weight: set.weight ?? null,
						calories: calories,
						distance: distance,
						order_index: set.order_index ?? setIndex
					});
				}
			}

			throw redirect(303, '/history');
		} catch (err) {
			// Re-throw redirects - check for status property that indicates a redirect
			if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
				throw err;
			}
			console.error('Error creating workout:', err);
			return fail(500, { error: 'Failed to create workout.' });
		}
	}
};
