<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Exercise } from '$lib/types';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';

	let { data, form } = $props();
	let exercises: Exercise[] = $state(data.exercises || []);
	let lastDataSignature = $state(JSON.stringify((data.exercises || []).map((exercise) => exercise.id)));
	let searchQuery = $state('');
	let showAddForm = $state(false);
	let name = $state('');
	let notes = $state('');
	let errorMessage = $state<string | null>(form?.error ?? null);
	let submitting = $state(false);

	// Group exercises by first letter
	let groupedExercises = $derived.by(() => {
		const filtered = exercises
			.filter((e) =>
				e.name.toLowerCase().includes(searchQuery.toLowerCase())
			)
			.sort((a, b) => a.name.localeCompare(b.name));

		const groups: Record<string, Exercise[]> = {};
		for (const exercise of filtered) {
			const letter = exercise.name.charAt(0).toUpperCase();
			if (!groups[letter]) {
				groups[letter] = [];
			}
			groups[letter].push(exercise);
		}
		return groups;
	});

	let sortedGroupLetters = $derived(
		Object.keys(groupedExercises).sort((a, b) => a.localeCompare(b))
	);

	$effect(() => {
		if (form?.error) {
			errorMessage = form.error;
		}
		if (form?.action === 'create' && form?.exercise) {
			errorMessage = null;
			if (!exercises.some((exercise) => exercise.id === form.exercise.id)) {
				exercises = [form.exercise as Exercise, ...exercises];
			}
			name = '';
			notes = '';
			showAddForm = false;
		}
		if (form?.action === 'delete' && form?.id) {
			errorMessage = null;
			exercises = exercises.filter((exercise) => exercise.id !== form.id);
		}
		if (form?.values) {
			name = form.values.name ?? name;
			notes = form.values.notes ?? notes;
		}
	});

	$effect(() => {
		const nextSignature = JSON.stringify((data.exercises || []).map((exercise) => exercise.id));
		if (nextSignature !== lastDataSignature) {
			exercises = data.exercises || [];
			lastDataSignature = nextSignature;
		}
	});

	const createEnhance = () => {
		submitting = true;
		errorMessage = null;
		return async ({ result }) => {
			submitting = false;
			if (result.type === 'failure') {
				errorMessage = result.data?.error ?? 'Failed to add exercise.';
			}
		};
	};

	const deleteEnhance = () => {
		errorMessage = null;
		return async ({ result }) => {
			if (result.type === 'failure') {
				errorMessage = result.data?.error ?? 'Failed to delete exercise.';
			}
		};
	};
</script>


<div class="min-h-screen pb-20">
	<!-- Sticky Header -->
	<header class="sticky top-0 z-10 border-b border-pink-200 bg-white/80 backdrop-blur-md">
		<div class="flex items-center justify-between px-4 py-4">
			<div>
				<h1 class="font-display text-xl font-semibold text-pink-900">💪 Exercises</h1>
				<p class="text-xs text-pink-500">
					{exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
				</p>
			</div>
			<button
				type="button"
				onclick={() => (showAddForm = !showAddForm)}
				class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/30 transition-all hover:scale-105 active:scale-95"
				aria-label={showAddForm ? 'Close add exercise form' : 'Open add exercise form'}
			>
				{#if showAddForm}
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				{:else}
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
				{/if}
			</button>
		</div>

		<!-- Search Bar -->
		<div class="px-4 pb-4">
			<div class="relative">
				<svg
					class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-pink-400"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
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
				{#if searchQuery}
					<button
						type="button"
						onclick={() => (searchQuery = '')}
						class="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-600"
						aria-label="Clear search"
					>
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</header>

	<!-- Add Exercise Form (Collapsible) -->
	{#if showAddForm}
		<form
			class="mx-4 mt-4 overflow-hidden rounded-2xl border border-pink-200 bg-white p-5 shadow-lg shadow-pink-500/10"
			method="POST"
			action="?/create"
			use:enhance={createEnhance}
		>
			<h2 class="mb-4 font-medium text-pink-800">Add New Exercise ✨</h2>

			{#if errorMessage}
				<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
					{errorMessage}
				</div>
			{/if}

			<div class="space-y-3">
				<input
					type="text"
					name="name"
					bind:value={name}
					placeholder="Exercise name"
					class="input"
					required
				/>
				<input
					type="text"
					name="notes"
					bind:value={notes}
					placeholder="Notes (optional)"
					class="input"
				/>
			</div>

			<div class="mt-4 flex gap-2">
				<button
					type="submit"
					class="btn-primary flex-1"
					disabled={submitting}
				>
					{submitting ? 'Adding...' : 'Add Exercise'}
				</button>
				<button
					type="button"
					onclick={() => {
						showAddForm = false;
						name = '';
						notes = '';
						errorMessage = null;
					}}
					class="btn-secondary"
				>
					Cancel
				</button>
			</div>
		</form>
	{/if}

	<main class="px-4 pt-4">
		{#if errorMessage && exercises.length === 0}
			<ErrorMessage message={errorMessage} />
		{:else if exercises.length === 0}
			<div class="py-16 text-center">
				<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-100">
					<svg class="h-8 w-8 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
				</div>
				<h3 class="mb-1 font-medium text-pink-800">No exercises yet</h3>
				<p class="text-sm text-pink-500">Tap the + button to add your first exercise</p>
			</div>
		{:else if Object.keys(groupedExercises).length === 0}
			<div class="py-16 text-center">
				<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-100">
					<svg class="h-8 w-8 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="11" cy="11" r="8" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
				</div>
				<h3 class="mb-1 font-medium text-pink-800">No results</h3>
				<p class="text-sm text-pink-500">Try a different search term</p>
			</div>
		{:else}
			<!-- Exercise List -->
			{#each sortedGroupLetters as letter}
				<section class="mb-6">
					<h2 class="mb-2 flex items-center gap-2 text-sm font-medium text-pink-500">
						<span class="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-xs font-bold">
							{letter}
						</span>
						<span class="uppercase">{letter}</span>
					</h2>

					<ul class="space-y-2">
						{#each groupedExercises[letter] as exercise (exercise.id)}
							<li class="group card relative overflow-hidden transition-all hover:-translate-y-0.5">
								<a
									href="/exercises/{exercise.id}"
									class="flex items-center gap-3 px-4 py-3 pr-14"
								>
									<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-100 to-pink-200">
										<span class="font-bold text-pink-600">
											{exercise.name.charAt(0).toUpperCase()}
										</span>
									</div>
									<div class="min-w-0 flex-1">
										<p class="truncate font-medium text-pink-800">
											{exercise.name}
										</p>
										{#if exercise.notes}
											<p class="truncate text-xs text-pink-400">
												{exercise.notes}
											</p>
										{/if}
									</div>
								</a>

								<!-- Delete button (visible on hover/focus) -->
								<button
									type="button"
									onclick={() => handleDelete(exercise.id, exercise.name)}
									class="absolute right-0 top-0 h-full px-4 text-pink-400 transition-colors hover:bg-red-50 hover:text-red-500"
									title="Delete exercise"
								>
									<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<polyline points="3 6 5 6 21 6" />
										<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
									</svg>
								</button>
							</li>
						{/each}
					</ul>
				</section>
			{/each}

			<!-- FAB hint for mobile -->
			{#if !showAddForm}
				<div class="fixed bottom-6 right-6 md:hidden">
					<button
						type="button"
						onclick={() => (showAddForm = true)}
						class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/30 transition-all hover:scale-105 active:scale-95"
						aria-label="Add exercise"
					>
						<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
					</button>
				</div>
			{/if}
		{/if}
	</main>
</div>
