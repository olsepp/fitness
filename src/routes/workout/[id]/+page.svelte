<script lang="ts">
	import { goto } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import type { WorkoutSession, WorkoutExercise, WorkoutSet, Exercise, WorkoutType } from '$lib/types';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';

	let { data } = $props();
	let workout: WorkoutSession | null = $state(data.workout || null);
	let workoutId = $derived(workout?.id ?? data.workout?.id ?? '');
	let workoutTypes: WorkoutType[] = $state(data.workoutTypes || []);
	let availableExercises: Exercise[] = $state(data.availableExercises || []);
	let searchQuery = $state('');

	// Form state
	let workoutDate = $state(workout?.date || '');
	let workoutTypeId = $state(workout?.workout_type_id || '');
	let notes = $state(workout?.notes || '');

	// Add exercise modal
	let showAddExercise = $state(false);
	let newExerciseName = $state('');

	// UI state
	let isSaving = $state(false);
	let errorMessage = $state<string | null>(null);

	// Track removed exercises and sets (only deleted on save)
	let removedExerciseIds: string[] = $state([]);
	let removedSetIds: string[] = $state([]);

	// Helper to format weight for display
	function getWeightDisplay(weight: number | null): string {
		return weight === null || weight === undefined ? '' : String(weight);
	}

	function parseWeight(value: string): number | null {
		const parsed = parseFloat(value);
		return isNaN(parsed) || value.trim() === '' ? null : parsed;
	}

	function parseNumber(value: string): number | null {
		const parsed = parseFloat(value);
		return isNaN(parsed) || value.trim() === '' ? null : parsed;
	}

	// Generate temporary IDs for optimistic updates
	function generateTempId(): string {
		return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	// Remove temp set on failure
	function removeTempSet(workoutData: WorkoutSession, exerciseId: string, tempId: string): WorkoutSession {
		return {
			...workoutData,
			workout_exercise: workoutData.workout_exercise?.map((e) =>
				e.id === exerciseId
					? { ...e, workout_set: e.workout_set?.filter(s => s.id !== tempId) }
					: e
			)
		};
	}

	// Replace temp with real set
	function replaceTempSet(workoutData: WorkoutSession, exerciseId: string, tempId: string, realSet: WorkoutSet): WorkoutSession {
		return {
			...workoutData,
			workout_exercise: workoutData.workout_exercise?.map((e) =>
				e.id === exerciseId
					? { ...e, workout_set: e.workout_set?.map(s => s.id === tempId ? realSet : s) }
					: e
			)
		};
	}

	// Remove temp exercise on failure
	function removeTempExercise(workoutData: WorkoutSession, tempId: string): WorkoutSession {
		return {
			...workoutData,
			workout_exercise: workoutData.workout_exercise?.filter(e => e.id !== tempId)
		};
	}

	// Replace temp with real exercise
	function replaceTempExercise(workoutData: WorkoutSession, tempId: string, realExercise: WorkoutExercise): WorkoutSession {
		return {
			...workoutData,
			workout_exercise: workoutData.workout_exercise?.map(e => e.id === tempId ? { ...realExercise, workout_set: realExercise.workout_set || [] } : e)
		};
	}

	// Filter exercises for add modal
	let filteredExercises = $derived(
		searchQuery.trim() === ''
			? availableExercises
			: availableExercises.filter((ex) =>
					ex.name.toLowerCase().includes(searchQuery.toLowerCase()),
				),
	);

	let addedExerciseIds = $derived(
		new Set(workout?.workout_exercise?.map((e) => e.exercise_id) || []),
	);

	// Get visible exercises and sets (excluding removed ones)
	let visibleExercises = $derived(
		workout?.workout_exercise?.filter((e) => !removedExerciseIds.includes(e.id)) || [],
	);

	// Helper to get visible sets for an exercise
	function getVisibleSets(sets: WorkoutSet[] | undefined) {
		return sets?.filter((s) => !removedSetIds.includes(s.id)) || [];
	}

	async function postAction(action: string, values: Record<string, string>) {
		const formData = new FormData();
		Object.entries(values).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				formData.append(key, value);
			}
		});

		const response = await fetch(`?/` + action, {
			method: 'POST',
			body: formData,
			headers: {
				accept: 'application/json'
			}
		});

		return deserialize(await response.text());
	}

	async function handleAddExercise(exercise: Exercise) {
		if (!workout) return;

		const orderIndex = workout.workout_exercise?.length || 0;
		const tempId = generateTempId();

		// Create optimistic exercise
		const exerciseType = exercise.exercise_type || 'strength';
		const tempExercise: WorkoutExercise = {
			id: tempId,
			workout_session_id: workoutId,
			exercise_id: exercise.id,
			name_snapshot: exercise.name,
			notes: null,
			is_completed: false,
			order_index: orderIndex,
			exercise_type: exerciseType,
			workout_set: [],
			created_at: new Date().toISOString()
		};

		// Optimistic update - update UI immediately
		workout = {
			...workout,
			workout_exercise: [
				...(workout.workout_exercise || []),
				tempExercise
			]
		};

		showAddExercise = false;
		searchQuery = '';

		try {
			const result = await postAction('add-exercise', {
				workout_id: workoutId,
				exercise_id: exercise.id,
				name_snapshot: exercise.name,
				order_index: String(orderIndex)
			});

			if (result.type === 'redirect') {
				await goto(result.location);
				return;
			}

			if (result.type === 'failure') {
				// Revert on failure - remove temp exercise
				workout = removeTempExercise(workout, tempId);
				errorMessage = String(result.data?.error ?? 'Failed to add exercise.');
				return;
			}

			if (result.type !== 'success') {
				// Remove temp exercise if not success
				workout = removeTempExercise(workout, tempId);
				return;
			}

			const newWorkoutExercise = result.data?.workoutExercise as WorkoutExercise | undefined;
			if (newWorkoutExercise) {
				// Replace temp with real exercise
				workout = replaceTempExercise(workout, tempId, newWorkoutExercise);
			} else {
				// Remove temp exercise if no real exercise returned
				workout = removeTempExercise(workout, tempId);
			}
		} catch (error) {
			// Revert on error - remove temp exercise
			workout = removeTempExercise(workout, tempId);
			errorMessage = error instanceof Error ? error.message : 'Failed to add exercise.';
		}
	}

	async function handleCreateNewExercise() {
		const trimmedName = newExerciseName.trim();
		if (!trimmedName) {
			errorMessage = 'Exercise name is required.';
			return;
		}

		if (!workout) return;

		const orderIndex = workout.workout_exercise?.length || 0;
		const tempId = generateTempId();

		// Create optimistic exercise
		const exerciseType = 'strength';
		const tempExercise: WorkoutExercise = {
			id: tempId,
			workout_session_id: workoutId,
			exercise_id: tempId, // Temporary, will be replaced
			name_snapshot: trimmedName,
			notes: null,
			is_completed: false,
			order_index: orderIndex,
			exercise_type: exerciseType,
			workout_set: [],
			created_at: new Date().toISOString()
		};

		// Optimistic update - update UI immediately
		workout = {
			...workout,
			workout_exercise: [
				...(workout.workout_exercise || []),
				tempExercise
			]
		};

		newExerciseName = '';
		showAddExercise = false;
		searchQuery = '';

		try {
			const result = await postAction('create-exercise', {
				workout_id: workoutId,
				name: trimmedName,
				notes: '',
				order_index: String(orderIndex)
			});

			if (result.type === 'redirect') {
				await goto(result.location);
				return;
			}

			if (result.type === 'failure') {
				// Revert on failure - remove temp exercise
				workout = removeTempExercise(workout, tempId);
				errorMessage = String(result.data?.error ?? 'Failed to create exercise.');
				return;
			}

			if (result.type !== 'success') {
				// Remove temp exercise if not success
				workout = removeTempExercise(workout, tempId);
				return;
			}

			const createdExercise = result.data?.exercise as Exercise | undefined;
			const newWorkoutExercise = result.data?.workoutExercise as WorkoutExercise | undefined;
			
			// Add to available exercises
			if (createdExercise && !availableExercises.some((ex) => ex.id === createdExercise.id)) {
				availableExercises = [createdExercise, ...availableExercises];
			}
			
			// Replace temp with real exercise
			if (newWorkoutExercise) {
				workout = replaceTempExercise(workout, tempId, newWorkoutExercise);
			} else {
				// Remove temp exercise if no real exercise returned
				workout = removeTempExercise(workout, tempId);
			}
		} catch (error) {
			// Revert on error - remove temp exercise
			workout = removeTempExercise(workout, tempId);
			errorMessage = error instanceof Error ? error.message : 'Failed to create exercise.';
		}
	}

	function handleRemoveExercise(exerciseId: string) {
		if (!workout) return;

		// Mark as removed locally (will be deleted on save)
		removedExerciseIds = [...removedExerciseIds, exerciseId];
	}

	async function handleAddSet(exerciseId: string) {
		if (!workout) return;

		const exercise = workout.workout_exercise?.find((e) => e.id === exerciseId);
		if (!exercise) return;

		const isCardio = exercise.exercise_type === 'cardio';
		const orderIndex = exercise.workout_set?.length || 0;
		const tempId = generateTempId();

		// Create optimistic set - cardio exercises start with null reps
		const tempSet: WorkoutSet = {
			id: tempId,
			workout_exercise_id: exerciseId,
			reps: isCardio ? 0 : 10,
			weight: null,
			calories: null,
			distance: null,
			order_index: orderIndex,
			created_at: new Date().toISOString()
		};

		// Optimistic update - update UI immediately
		workout = {
			...workout,
			workout_exercise: workout.workout_exercise?.map((e) =>
				e.id === exerciseId
					? { ...e, workout_set: [...(e.workout_set || []), tempSet] }
					: e
			)
		};

		try {
			const params: Record<string, string> = {
				workout_exercise_id: exerciseId,
				order_index: String(orderIndex)
			};

			if (isCardio) {
				// For cardio, send empty values (user will fill in calories or distance)
				params.reps = '';
				params.weight = '';
			} else {
				params.reps = '10';
				params.weight = '';
			}

			const result = await postAction('add-set', params);

			if (result.type === 'redirect') {
				await goto(result.location);
				return;
			}

			if (result.type === 'failure') {
				// Revert on failure - remove temp set
				workout = removeTempSet(workout, exerciseId, tempId);
				errorMessage = String(result.data?.error ?? 'Failed to add set.');
				return;
			}

			if (result.type !== 'success') {
				// Remove temp set if not success
				workout = removeTempSet(workout, exerciseId, tempId);
				return;
			}

			const realSet = result.data?.set as WorkoutSet | undefined;
			if (realSet) {
				// Replace temp with real set
				workout = replaceTempSet(workout, exerciseId, tempId, realSet);
			} else {
				// Remove temp set if no real set returned
				workout = removeTempSet(workout, exerciseId, tempId);
			}
		} catch (error) {
			// Revert on error - remove temp set
			workout = removeTempSet(workout, exerciseId, tempId);
			errorMessage = error instanceof Error ? error.message : 'Failed to add set.';
		}
	}

	// Debounce timeouts for set updates (per set ID)
	let updateSetTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
	// Store previous values for potential revert (per set ID)
	let previousSetValues: Map<string, { reps: number; weight: number | null; calories: number | null; distance: number | null }> = new Map();

	function handleSetChange(set: WorkoutSet, field: 'reps' | 'weight' | 'calories' | 'distance', value: string) {
		if (!workout) return;

		// Store previous value for potential revert (only if not already stored)
		if (!previousSetValues.has(set.id)) {
			previousSetValues.set(set.id, { reps: set.reps, weight: set.weight, calories: set.calories, distance: set.distance });
		}

		// Update UI immediately (optimistic)
		const updatedSet = {
			...set,
			[field]: field === 'reps' ? parseInt(value) || 0 : 
			          field === 'weight' ? parseWeight(value) : 
			          parseNumber(value)
		};

		// Update the set in workout state
		workout = {
			...workout,
			workout_exercise: workout.workout_exercise?.map((e) =>
				e.id === set.workout_exercise_id
					? { ...e, workout_set: e.workout_set?.map(s => s.id === set.id ? updatedSet : s) }
					: e
			)
		};

		// Debounce server sync
		const existingTimeout = updateSetTimeouts.get(set.id);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
		}

		updateSetTimeouts.set(set.id, setTimeout(() => syncSetToServer(updatedSet), 500));
	}

	async function syncSetToServer(set: WorkoutSet) {
		const previousValues = previousSetValues.get(set.id);

		try {
			const result = await postAction('update-set', {
				set_id: set.id,
				reps: String(set.reps),
				weight: typeof set.weight === 'number' ? String(set.weight) : '',
				calories: typeof set.calories === 'number' ? String(set.calories) : '',
				distance: typeof set.distance === 'number' ? String(set.distance) : ''
			});

			if (result.type === 'redirect') {
				await goto(result.location);
				return;
			}

			if (result.type === 'failure') {
				// Revert on failure
				if (previousValues && workout) {
					workout = {
						...workout,
						workout_exercise: workout.workout_exercise?.map((e) =>
							e.id === set.workout_exercise_id
								? { ...e, workout_set: e.workout_set?.map(s => s.id === set.id ? { ...s, ...previousValues } : s) }
								: e
						)
					};
				}
				errorMessage = String(result.data?.error ?? 'Failed to update set.');
			}

			// Clear previous values on success
			previousSetValues.delete(set.id);
		} catch (error) {
			// Revert on error
			if (previousValues && workout) {
				workout = {
					...workout,
					workout_exercise: workout.workout_exercise?.map((e) =>
						e.id === set.workout_exercise_id
							? { ...e, workout_set: e.workout_set?.map(s => s.id === set.id ? { ...s, ...previousValues } : s) }
							: e
					)
				};
			}
			errorMessage = error instanceof Error ? error.message : 'Failed to update set.';
		}

		updateSetTimeouts.delete(set.id);
	}

	async function handleUpdateSet(set: WorkoutSet) {
		try {
			const result = await postAction('update-set', {
				set_id: set.id,
				reps: String(set.reps),
				weight: typeof set.weight === 'number' ? String(set.weight) : '',
				calories: typeof set.calories === 'number' ? String(set.calories) : '',
				distance: typeof set.distance === 'number' ? String(set.distance) : ''
			});

			if (result.type === 'redirect') {
				await goto(result.location);
				return;
			}

			if (result.type === 'failure') {
				errorMessage = String(result.data?.error ?? 'Failed to update set.');
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to update set.';
		}
	}

	function handleRemoveSet(exerciseId: string, setId: string) {
		if (!workout) return;

		// Mark set as removed locally (will be deleted on save)
		removedSetIds = [...removedSetIds, setId];
	}

	async function handleToggleComplete() {
		if (!workout) return;

		// Store previous state for potential revert
		const previousState = workout.is_completed;
		const nextState = !previousState;

		// Optimistic update - update UI immediately
		workout = { ...workout, is_completed: nextState };

		try {
			const result = await postAction('toggle-workout-complete', {
				workout_id: workoutId,
				is_completed: String(nextState)
			});

			if (result.type === 'redirect') {
				await goto(result.location);
				return;
			}

			if (result.type === 'failure') {
				// Revert on failure
				workout = { ...workout, is_completed: previousState };
				errorMessage = String(result.data?.error ?? 'Failed to update workout.');
				return;
			}
		} catch (error) {
			// Revert on error
			workout = { ...workout, is_completed: previousState };
			errorMessage = error instanceof Error ? error.message : 'Failed to update workout.';
		}
	}

	async function handleToggleExerciseComplete(exercise: WorkoutExercise) {
		if (!workout) return;

		// Store previous state for potential revert
		const previousState = exercise.is_completed;
		const newState = !previousState;

		// Optimistic update - update UI immediately
		workout = {
			...workout,
			workout_exercise: workout.workout_exercise?.map((e) =>
				e.id === exercise.id ? { ...e, is_completed: newState } : e
			),
		};

		try {
			const result = await postAction('toggle-exercise-complete', {
				workout_exercise_id: exercise.id,
				is_completed: String(newState)
			});

			if (result.type === 'redirect') {
				await goto(result.location);
				return;
			}

			if (result.type === 'failure') {
				// Revert on failure
				workout = {
					...workout,
					workout_exercise: workout.workout_exercise?.map((e) =>
						e.id === exercise.id ? { ...e, is_completed: previousState } : e
					),
				};
				errorMessage = String(result.data?.error ?? 'Failed to update exercise.');
				return;
			}
		} catch (error) {
			// Revert on error
			workout = {
				...workout,
				workout_exercise: workout.workout_exercise?.map((e) =>
					e.id === exercise.id ? { ...e, is_completed: previousState } : e
				),
			};
			errorMessage = error instanceof Error ? error.message : 'Failed to update exercise.';
		}
	}

	// Workout progress calculation
	let workoutProgress = $derived.by(() => {
		if (!visibleExercises) return { completed: 0, total: 0, percentage: 0 };
		const total = visibleExercises.length;
		const completed = visibleExercises.filter((e) => e.is_completed).length;
		return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
	});

	async function handleSaveWorkout() {
		if (!workout) return;

		isSaving = true;
		errorMessage = null;

		try {
			const result = await postAction('save-workout', {
				workout_id: workoutId,
				workout_type_id: workoutTypeId,
				date: workoutDate,
				notes: notes,
				removed_exercise_ids: JSON.stringify(removedExerciseIds),
				removed_set_ids: JSON.stringify(removedSetIds)
			});

			if (result.type === 'redirect') {
				await goto(result.location);
				return;
			}

			if (result.type === 'failure') {
				errorMessage = String(result.data?.error ?? 'Failed to save workout.');
				return;
			}

			goto('/history');
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to save workout.';
		} finally {
			isSaving = false;
		}
	}

	function handleCancel() {
		goto('/history');
	}
</script>

<div class="mx-auto max-w-3xl space-y-6 p-4">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="font-display text-2xl font-semibold text-pink-900">Edit Workout ✏️</h1>
			<p class="mt-1 text-sm text-pink-500">View and modify your workout details</p>
		</div>
		<button
			onclick={handleToggleComplete}
			class="rounded-xl px-4 py-2 text-sm font-medium transition-all
			{workout?.is_completed
				? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300'
				: 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'}"
		>
			{workout?.is_completed ? '◐ Mark Incomplete' : '✓ Mark Complete'}
		</button>
	</header>

	<!-- Workout Progress -->
	{#if visibleExercises.length > 0}
		<div class="card p-4">
			<div class="mb-2 flex justify-between text-sm">
				<span class="font-medium text-pink-600">Exercises Completed</span>
				<span class="font-semibold text-pink-700">
					{workoutProgress.completed} / {workoutProgress.total}
				</span>
			</div>
			<div class="h-3 overflow-hidden rounded-full bg-pink-100">
				<div
					class="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-500 transition-all"
					style="width: {workoutProgress.percentage}%"
				></div>
			</div>
		</div>
	{/if}

	{#if errorMessage}
		<div class="mt-4">
			<ErrorMessage message={errorMessage} />
		</div>
	{/if}

	{#if workout}
		<form class="space-y-6" onsubmit={(e) => { e.preventDefault(); handleSaveWorkout(); }}>
			<!-- Workout Details -->
			<div class="card p-5">
				<h2 class="mb-4 font-display text-lg font-medium text-pink-800">Workout Details 📝</h2>
				<div class="grid gap-4 md:grid-cols-2">
					<label class="flex flex-col gap-2 text-sm">
						<span class="font-medium text-pink-700">Date</span>
						<input
							type="date"
							bind:value={workoutDate}
							class="input"
						/>
					</label>
					<label class="flex flex-col gap-2 text-sm">
						<span class="font-medium text-pink-700">Workout Type</span>
						<select
							bind:value={workoutTypeId}
							class="input"
						>
							{#each workoutTypes as type}
								<option value={type.id}>{type.name}</option>
							{/each}
						</select>
					</label>
				</div>
				<label class="mt-4 flex flex-col gap-2 text-sm">
					<span class="font-medium text-pink-700">Notes (optional)</span>
					<textarea
						bind:value={notes}
						rows="3"
						class="input resize-none"
						placeholder="Any notes about this workout..."
					></textarea>
				</label>
			</div>

			<!-- Exercises Section -->
			<div class="card p-5">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="font-display text-lg font-medium text-pink-800">Exercises 💪</h2>
					<button
						type="button"
						onclick={() => (showAddExercise = true)}
						class="btn-primary text-sm"
					>
						Add Exercise
					</button>
				</div>

				{#if showAddExercise}
					<div class="mb-4 overflow-hidden rounded-xl border border-pink-200 bg-pink-50/50 p-4">
						<h3 class="mb-3 font-medium text-pink-800">Add Exercise 🔍</h3>

						<label class="mb-3 flex flex-col gap-2 text-sm">
							<span class="font-medium text-pink-600">Search existing</span>
							<div class="relative">
								<svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<circle cx="11" cy="11" r="8" />
									<line x1="21" y1="21" x2="16.65" y2="16.65" />
								</svg>
								<input
									type="text"
									bind:value={searchQuery}
									placeholder="Search exercises..."
									class="input pl-10"
								/>
							</div>
						</label>

						{#if filteredExercises.length > 0}
							<div class="mb-3 max-h-40 overflow-y-auto space-y-1 rounded-lg bg-white p-2">
								{#each filteredExercises as exercise}
									{#if !addedExerciseIds.has(exercise.id)}
										<button
											type="button"
											onclick={() => handleAddExercise(exercise)}
											class="w-full rounded-lg px-3 py-2 text-left text-sm text-pink-700 transition-colors hover:bg-pink-100"
										>
											{exercise.name}
										</button>
									{/if}
								{/each}
							</div>
						{/if}

						<div class="border-t border-pink-200 pt-3">
							<p class="mb-2 text-xs text-pink-500">Or create a new exercise:</p>
							<div class="flex gap-2">
								<input
									type="text"
									bind:value={newExerciseName}
									placeholder="New exercise name..."
									class="input flex-1 text-sm"
								/>
								<button
									type="button"
									onclick={handleCreateNewExercise}
									class="btn-secondary text-sm"
								>
									Create
								</button>
							</div>
						</div>

						<button
							type="button"
							onclick={() => {
								showAddExercise = false;
								searchQuery = '';
							}}
							class="mt-3 text-sm text-pink-500 hover:text-pink-700"
						>
							Cancel
						</button>
					</div>
				{/if}

				{#if visibleExercises.length === 0}
					<p class="py-8 text-center text-sm text-pink-400">
						No exercises added yet. Click "Add Exercise" to begin. 💪
					</p>
				{:else}
					<div class="space-y-4">
						{#each visibleExercises as exercise}
							<div class="overflow-hidden rounded-xl border transition-all {exercise.is_completed ? 'border-green-200 bg-green-50/50' : 'border-pink-200 bg-white'}">
								<div class="flex items-center justify-between px-4 py-3">
									<div class="flex items-center gap-3">
										<button
											type="button"
											onclick={() => handleToggleExerciseComplete(exercise)}
											class="flex h-10 w-10 items-center justify-center rounded-full transition-all {exercise.is_completed ? 'bg-green-500 text-white' : 'bg-pink-100 text-pink-500 hover:bg-pink-200'}"
											title={exercise.is_completed ? 'Mark as incomplete' : 'Mark as complete'}
										>
											{#if exercise.is_completed}
												<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
													<polyline points="20 6 9 17 4 12" />
												</svg>
											{:else}
												<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
													<circle cx="12" cy="12" r="10" />
													<line x1="12" y1="8" x2="12" y2="12" />
													<line x1="12" y1="16" x2="12.01" y2="16" />
												</svg>
											{/if}
										</button>
										<div>
											<h3 class="font-semibold {exercise.is_completed ? 'text-green-700 line-through' : 'text-pink-800'}">{exercise.name_snapshot}</h3>
											<p class="text-xs {exercise.is_completed ? 'text-green-600' : 'text-pink-400'}">
												{exercise.is_completed ? 'Completed ✓' : 'Click to mark complete'}
											</p>
										</div>
									</div>
									<button
										type="button"
										onclick={() => handleRemoveExercise(exercise.id)}
										class="text-xs text-pink-400 hover:text-red-500"
									>
										Remove
									</button>
								</div>

								<div class="space-y-2 border-t border-pink-100 px-4 py-3">
									{#if exercise.exercise_type === 'cardio'}
										<div class="flex items-center gap-4 text-xs font-medium text-pink-500">
											<span class="w-12">Set</span>
											<span class="w-20">Weight</span>
											<span class="w-24">Distance (m)</span>
											<span class="w-8"></span>
										</div>
										{#each getVisibleSets(exercise.workout_set) as set, index}
											<div class="flex items-center gap-4">
												<span class="w-12 text-sm text-pink-400">{index + 1}</span>
												<input
													type="number"
													min="0"
													step="0.5"
													value={getWeightDisplay(set.weight)}
													oninput={(e) => handleSetChange(set, 'weight', e.currentTarget.value)}
													placeholder="kg"
													class="input w-20 py-1.5 text-center text-sm"
												/>
												<input
													type="number"
													min="0"
													value={set.distance ?? ''}
													oninput={(e) => handleSetChange(set, 'distance', e.currentTarget.value)}
													placeholder="m"
													class="input w-24 py-1.5 text-center text-sm"
												/>
												<button
													type="button"
													onclick={() => handleRemoveSet(exercise.id, set.id)}
													class="flex h-8 w-8 items-center justify-center rounded-lg text-pink-400 hover:bg-pink-100 hover:text-red-500"
												>
													<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
														<line x1="18" y1="6" x2="6" y2="18" />
														<line x1="6" y1="6" x2="18" y2="18" />
													</svg>
												</button>
											</div>
										{/each}
										<button
											type="button"
											onclick={() => handleAddSet(exercise.id)}
											class="mt-2 text-sm font-medium text-pink-500 hover:text-pink-700"
										>
											+ Add Set
										</button>
									{:else}
										<div class="flex items-center gap-4 text-xs font-medium text-pink-500">
											<span class="w-12">Set</span>
											<span class="w-20">Reps</span>
											<span class="w-20">Weight</span>
											<span class="w-8"></span>
										</div>
										{#each getVisibleSets(exercise.workout_set) as set, index}
											<div class="flex items-center gap-4">
												<span class="w-12 text-sm text-pink-400">{index + 1}</span>
												<input
													type="number"
													min="1"
													value={set.reps}
													oninput={(e) => handleSetChange(set, 'reps', e.currentTarget.value)}
													class="input w-20 py-1.5 text-center text-sm"
												/>
												<input
													type="number"
													min="0"
													step="0.5"
													value={getWeightDisplay(set.weight)}
													oninput={(e) => handleSetChange(set, 'weight', e.currentTarget.value)}
													placeholder="--"
													class="input w-20 py-1.5 text-center text-sm"
												/>
												<button
													type="button"
													onclick={() => handleRemoveSet(exercise.id, set.id)}
													class="flex h-8 w-8 items-center justify-center rounded-lg text-pink-400 hover:bg-pink-100 hover:text-red-500"
												>
													<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
														<line x1="18" y1="6" x2="6" y2="18" />
														<line x1="6" y1="6" x2="18" y2="18" />
													</svg>
												</button>
											</div>
										{/each}
										<button
											type="button"
											onclick={() => handleAddSet(exercise.id)}
											class="mt-2 text-sm font-medium text-pink-500 hover:text-pink-700"
										>
											+ Add Set
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex gap-4">
				<button
					type="submit"
					disabled={isSaving}
					class="btn-primary flex-1"
				>
					{#if isSaving}
						<svg class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
							<path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round" />
						</svg>
						Saving...
					{:else}
						Save Changes
					{/if}
				</button>
				<button
					type="button"
					onclick={handleCancel}
					disabled={isSaving}
					class="btn-secondary"
				>
					Cancel
				</button>
			</div>
		</form>
	{/if}
</div>
