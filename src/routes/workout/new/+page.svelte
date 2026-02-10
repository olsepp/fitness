<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { createWorkoutSession } from '$lib/api/workoutSessions';
	import { createExercise } from '$lib/api/exercises';
	import { addWorkoutExercise } from '$lib/api/workoutExercises';
	import { addWorkoutSet } from '$lib/api/workoutSets';
	import type { WorkoutType, Exercise } from '$lib/types';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';

	let { data } = $props();

	// Form state
	let workoutDate = $state(formatDateToYYYYMMDD(new Date()));
	let workoutTypeId = $state('');
	let notes = $state('');

	// Data state from server
	let workoutTypes: WorkoutType[] = $derived(data.workoutTypes || []);
	let availableExercises: Exercise[] = $state(data.exercises || []);
	let searchQuery = $state('');

	// Keep availableExercises in sync with data.exercises when it changes
	// Use untrack to prevent reading availableExercises from creating a dependency loop
	$effect(() => {
		if (data.exercises) {
			// Only reset if we haven't added new exercises yet
			const serverIds = new Set(data.exercises.map((e: Exercise) => e.id));
			const hasAddedExercises = untrack(() => availableExercises.some((e) => !serverIds.has(e.id)));
			if (!hasAddedExercises) {
				availableExercises = data.exercises;
			}
		}
	});

	// New workout exercise state
	let selectedExercises: NewWorkoutExercise[] = $state([]);
	let showAddExercise = $state(false);
	let newExerciseName = $state('');

	// UI state
	let isCreatingExercise = $state(false);
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	interface NewWorkoutExercise {
		exercise: Exercise;
		exerciseId: string;
		nameSnapshot: string;
		notes: string | null;
		sets: NewWorkoutSet[];
	}

	interface NewWorkoutSet {
		reps: number;
		weight: number | null;
	}

	// Helper to format weight for input display
	function getWeightDisplay(weight: number | null): string {
		return weight === null || weight === undefined ? '' : String(weight);
	}

	// Helper to parse weight from input
	function parseWeight(value: string): number | null {
		const parsed = parseFloat(value);
		return isNaN(parsed) || value.trim() === '' ? null : parsed;
	}

	function formatDateToYYYYMMDD(date: Date): string {
		return date.toISOString().split('T')[0];
	}

	// Filter exercises based on search query
	let filteredExercises = $derived(
		searchQuery.trim() === ''
			? availableExercises
			: availableExercises.filter((ex) =>
					ex.name.toLowerCase().includes(searchQuery.toLowerCase()),
				),
	);

	// Get exercises already added to workout
	let addedExerciseIds = $derived(new Set(selectedExercises.map((e) => e.exerciseId)));

	async function handleAddExercise(exercise: Exercise) {
		const newWorkoutExercise: NewWorkoutExercise = {
			exercise,
			exerciseId: exercise.id,
			nameSnapshot: exercise.name,
			notes: null,
			sets: [{ reps: 10, weight: null }],
		};
		selectedExercises = [...selectedExercises, newWorkoutExercise];
		showAddExercise = false;
		searchQuery = '';
	}

	async function handleCreateNewExercise() {
		const trimmedName = newExerciseName.trim();
		if (!trimmedName) {
			errorMessage = 'Exercise name is required.';
			return;
		}

		isCreatingExercise = true;
		errorMessage = null;
		try {
			const newExercise = await createExercise(supabase, { name: trimmedName, notes: null });
			availableExercises = [newExercise, ...availableExercises];
			// Automatically add the new exercise to the workout
			await handleAddExercise(newExercise);
			newExerciseName = '';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to create exercise.';
		} finally {
			isCreatingExercise = false;
		}
	}

	function handleRemoveExercise(index: number) {
		selectedExercises = selectedExercises.filter((_, i) => i !== index);
	}

	function handleAddSet(exerciseIndex: number) {
		selectedExercises[exerciseIndex].sets = [
			...selectedExercises[exerciseIndex].sets,
			{ reps: 10, weight: null },
		];
	}

	function handleRemoveSet(exerciseIndex: number, setIndex: number) {
		selectedExercises[exerciseIndex].sets = selectedExercises[exerciseIndex].sets.filter(
			(_, i) => i !== setIndex,
		);
	}

	async function handleSubmit() {
		// Validation
		if (!workoutTypeId) {
			errorMessage = 'Please select a workout type.';
			return;
		}

		if (selectedExercises.length === 0) {
			errorMessage = 'Please add at least one exercise.';
			return;
		}

		// Check each exercise has at least one set
		for (const exercise of selectedExercises) {
			if (exercise.sets.length === 0) {
				errorMessage = `Exercise "${exercise.nameSnapshot}" must have at least one set.`;
				return;
			}
		}

		isSubmitting = true;
		errorMessage = null;

		try {
			// Create the workout session
			const session = await createWorkoutSession(supabase, {
				workout_type_id: workoutTypeId,
				date: workoutDate,
				notes: notes.trim() || null,
			});

			// Add exercises and sets
			for (const exercise of selectedExercises) {
				const workoutExercise = await addWorkoutExercise(supabase, {
					workout_session_id: session.id,
					exercise_id: exercise.exerciseId,
					name_snapshot: exercise.nameSnapshot,
					order_index: selectedExercises.indexOf(exercise),
					notes: exercise.notes,
				});

				// Add sets for this exercise
				for (const set of exercise.sets) {
					await addWorkoutSet(supabase, {
						workout_exercise_id: workoutExercise.id,
						reps: set.reps,
						weight: set.weight,
						order_index: exercise.sets.indexOf(set),
					});
				}
			}

			// Navigate to history or home
			goto('/history');
		} catch (error) {
			console.error('Create workout error:', error);
			const message = error instanceof Error ? error.message : 'Failed to save workout.';
			errorMessage = message.includes('401')
				? 'Unauthorized: please sign in before creating a workout.'
				: message;
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/');
	}
</script>

<div class="mx-auto max-w-3xl space-y-6 p-4">
	<header>
		<h1 class="font-display text-2xl font-semibold text-pink-900">New Workout ✨</h1>
		<p class="mt-1 text-sm text-pink-500">Create a new workout session and log your exercises.</p>
	</header>

	{#if errorMessage}
		<div class="mt-4">
			<ErrorMessage message={errorMessage} />
		</div>
	{/if}

	<form class="space-y-6" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
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
						<option value="">Select type...</option>
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
					<svg class="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					Add Exercise
				</button>
			</div>

			{#if showAddExercise}
				<div class="mb-4 overflow-hidden rounded-xl border border-pink-200 bg-pink-50/50 p-4">
					<h3 class="mb-3 font-medium text-pink-800">Add Exercise 🔍</h3>

					<!-- Search existing exercises -->
					<label class="mb-3 flex flex-col gap-2 text-sm">
						<span class="font-medium text-pink-600">Search existing</span>
						<div class="relative">
							<svg class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="11" cy="11" r="8" />
								<line x1="21" y1="21" x2="16.65" y2="16.65" />
							</svg>
							<input
								type="text"
								bind:value={searchQuery}
								placeholder="Search exercises..."
								class="input"
								style="padding-left: 2.75rem !important;"
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

					<!-- Or create new -->
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
								disabled={isCreatingExercise}
								class="btn-secondary text-sm"
							>
								{isCreatingExercise ? 'Creating...' : 'Create'}
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

			<!-- Selected Exercises -->
			{#if selectedExercises.length === 0}
				<p class="py-8 text-center text-sm text-pink-400">
					No exercises added yet. Click "Add Exercise" to begin. 💪
				</p>
			{:else}
				<div class="space-y-4">
					{#each selectedExercises as exercise, exerciseIndex}
						<div class="overflow-hidden rounded-xl border border-pink-200 bg-white">
							<div class="flex items-center justify-between bg-pink-50/50 px-4 py-3">
								<div>
									<h3 class="font-semibold text-pink-800">{exercise.nameSnapshot}</h3>
									<button
										type="button"
										onclick={() => handleRemoveExercise(exerciseIndex)}
										class="text-xs text-red-500 hover:text-red-600"
									>
										Remove
									</button>
								</div>
								<div class="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-sm font-bold text-pink-600">
									{exerciseIndex + 1}
								</div>
							</div>

							<!-- Sets -->
							<div class="space-y-2 p-4">
								<div class="flex items-center gap-4 text-xs font-medium text-pink-500">
									<span class="w-12">Set</span>
									<span class="w-20">Reps</span>
									<span class="w-20">Weight</span>
									<span class="w-8"></span>
								</div>
								{#each exercise.sets as set, setIndex}
									<div class="flex items-center gap-4">
										<span class="w-12 text-sm text-pink-400">{setIndex + 1}</span>
										<input
											type="number"
											min="1"
											bind:value={set.reps}
											class="input w-20 py-1.5 text-center text-sm"
										/>
										<input
											type="number"
											min="0"
											step="0.5"
											value={getWeightDisplay(set.weight)}
											oninput={(e) => (set.weight = parseWeight(e.currentTarget.value))}
											placeholder="--"
											class="input w-20 py-1.5 text-center text-sm"
										/>
										<button
											type="button"
											onclick={() => handleRemoveSet(exerciseIndex, setIndex)}
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
									onclick={() => handleAddSet(exerciseIndex)}
									class="mt-2 text-sm font-medium text-pink-500 hover:text-pink-700"
								>
									+ Add Set
								</button>
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
				disabled={isSubmitting}
				class="btn-primary flex-1"
			>
				{#if isSubmitting}
					<svg class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
						<path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round" />
					</svg>
					Saving...
				{:else}
					Save Workout
				{/if}
			</button>
			<button
				type="button"
				onclick={handleCancel}
				disabled={isSubmitting}
				class="btn-secondary"
			>
				Cancel
			</button>
		</div>
	</form>
</div>
