<script lang="ts">
	import { deserialize } from '$app/forms';
	import type { WorkoutSession } from '$lib/types';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';

	let { data } = $props();
	let workouts: WorkoutSession[] = $derived(data.workouts || []);
	let errorMessage = $state<string | null>(null);
	let activeTab: 'all' | 'completed' | 'not_completed' = $state('all');

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

	async function toggleComplete(event: Event, workout: WorkoutSession) {
		event.preventDefault();
		event.stopPropagation();
		try {
			const nextState = !workout.is_completed;
			const result = await postAction('toggle-complete', {
				workout_id: workout.id,
				is_completed: String(nextState)
			});

			if (result.type === 'failure') {
				errorMessage = String(result.data?.error ?? 'Failed to update workout.');
				return;
			}

			workouts = workouts.map((w) =>
				w.id === workout.id ? { ...w, is_completed: nextState } : w,
			);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to update workout.';
		}
	}

	let filteredWorkouts = $derived(
		activeTab === 'all'
			? workouts
			: activeTab === 'completed'
				? workouts.filter((w) => w.is_completed)
				: workouts.filter((w) => !w.is_completed),
	);

	let completedCount = $derived(workouts.filter((w) => w.is_completed).length);
	let notCompletedCount = $derived(workouts.filter((w) => !w.is_completed).length);
</script>

<div class="mx-auto max-w-3xl space-y-6 p-4">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="font-display text-2xl font-semibold text-pink-900">Workout History 📋</h1>
			<p class="mt-1 text-sm text-pink-500">View and manage your workouts</p>
		</div>
		<a href="/workout/new" class="btn-primary">
			<svg class="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
			New Workout
		</a>
	</header>

	<!-- Tabs -->
	<div class="flex gap-1 overflow-x-auto rounded-xl border border-pink-200 bg-white/60 p-1.5">
		<button
			onclick={() => (activeTab = 'all')}
			class="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all {activeTab === 'all'
				? 'bg-linear-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/25'
				: 'text-pink-500 hover:bg-pink-50'}"
		>
			All ({workouts.length})
		</button>
		<button
			onclick={() => (activeTab = 'not_completed')}
			class="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all {activeTab === 'not_completed'
				? 'bg-linear-to-r from-yellow-400 to-yellow-500 text-white shadow-lg shadow-yellow-500/25'
				: 'text-pink-500 hover:bg-pink-50'}"
		>
			In Progress ({notCompletedCount})
		</button>
		<button
			onclick={() => (activeTab = 'completed')}
			class="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all {activeTab === 'completed'
				? 'bg-linear-to-r from-green-400 to-green-500 text-white shadow-lg shadow-green-500/25'
				: 'text-pink-500 hover:bg-pink-50'}"
		>
			Completed ({completedCount})
		</button>
	</div>

	{#if errorMessage}
		<div class="mt-4">
			<ErrorMessage message={errorMessage} />
		</div>
	{/if}

	{#if workouts.length === 0}
		<div class="rounded-2xl border border-dashed border-pink-200 bg-pink-50/50 py-12 text-center">
			<div class="mb-4 flex justify-center">
				<div class="flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 text-3xl">💪</div>
			</div>
			<p class="text-pink-600">
				{activeTab === 'all'
					? 'No workouts yet. Start your first workout!'
					: activeTab === 'completed'
						? 'No completed workouts yet. Keep going!'
						: 'No pending workouts. Time to train!'}
			</p>
			<a href="/workout/new" class="btn-primary mt-4 inline-flex">
				Create Workout
			</a>
		</div>
	{:else}
		<div class="space-y-4">
			{#each filteredWorkouts as workout}
				<a
					href="/workout/{workout.id}"
					class="group card block p-4 transition-all hover:-translate-y-1 {workout.is_completed ? 'opacity-75' : ''}"
				>
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<span
									class="badge {workout.is_completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}"
								>
									{workout.is_completed ? '✓ Completed' : '◐ In Progress'}
								</span>
								<span class="text-sm text-pink-400">
									{new Date(workout.date).toLocaleDateString('en-US', {
										weekday: 'short',
										year: 'numeric',
										month: 'short',
										day: 'numeric',
									})}
								</span>
								{#if workout.workout_type}
									<span class="badge-pink">
										{workout.workout_type.name}
									</span>
								{/if}
							</div>

							{#if workout.notes}
								<p class="mt-2 text-sm text-pink-500">{workout.notes}</p>
							{/if}

							{#if workout.workout_exercise && workout.workout_exercise.length > 0}
								<div class="mt-3 space-y-1">
									{#each workout.workout_exercise.slice(0, 3) as exercise}
										<div class="flex items-center gap-2 text-sm text-pink-600">
											<span class="h-1.5 w-1.5 rounded-full bg-pink-400"></span>
											<span>{exercise.name_snapshot}</span>
											<span class="text-pink-400">({exercise.workout_set?.length || 0} sets)</span>
										</div>
									{/each}
									{#if workout.workout_exercise.length > 3}
										<p class="text-xs text-pink-400">
											+{workout.workout_exercise.length - 3} more exercises
										</p>
									{/if}
								</div>
							{/if}
						</div>

						<button
							onclick={(e) => toggleComplete(e, workout)}
							class="ml-4 rounded-xl p-2.5 text-sm font-medium transition-all hover:scale-110
							{workout.is_completed
								? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
								: 'bg-green-100 text-green-600 hover:bg-green-200'}"
							title={workout.is_completed ? 'Mark as incomplete' : 'Mark as complete'}
						>
							{#if workout.is_completed}
								<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
									<circle cx="12" cy="12" r="10" />
									<line x1="12" y1="8" x2="12" y2="12" />
									<line x1="12" y1="16" x2="12.01" y2="16" />
								</svg>
							{:else}
								<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
									<polyline points="20 6 9 17 4 12" />
								</svg>
							{/if}
						</button>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
