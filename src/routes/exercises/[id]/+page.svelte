<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import type { Exercise } from '$lib/types';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';

	let { data, form } = $props();
	let exercise: Exercise | null = $state(data.exercise ?? null);
	let name = $state(exercise?.name ?? '');
	let notes = $state(exercise?.notes ?? '');
	let isLoading = $state(false);
	let isSaving = $state(false);
	let errorMessage = $state<string | null>(form?.error ?? null);

	$effect(() => {
		exercise = data.exercise ?? null;
		if (exercise) {
			name = form?.values?.name ?? exercise.name;
			notes = form?.values?.notes ?? (exercise.notes || '');
		}
		if (form?.error) {
			errorMessage = form.error;
		}
	});

	const updateEnhance = () => {
		isSaving = true;
		errorMessage = null;
		return async ({ result }) => {
			isSaving = false;
			if (result.type === 'failure') {
				errorMessage = result.data?.error ?? 'Failed to update exercise.';
			}
		};
	};
</script>

<div class="mx-auto max-w-2xl space-y-6 p-4">
	<header class="flex items-center gap-4">
		<a href="/exercises" class="text-pink-400 hover:text-pink-600 transition-colors" aria-label="Back to exercises">
			<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="19" y1="12" x2="5" y2="12" />
				<polyline points="12 19 5 12 12 5" />
			</svg>
		</a>
		<div>
			<h1 class="font-display text-2xl font-semibold text-pink-900">Edit Exercise ✏️</h1>
			<p class="mt-1 text-sm text-pink-500">Update exercise details</p>
		</div>
	</header>

	{#if errorMessage}
		<ErrorMessage message={errorMessage} />
	{/if}

	{#if isLoading}
		<div class="py-16">
			<LoadingSpinner text="Loading exercise..." />
		</div>
	{:else if exercise}
		<form class="card p-6" method="POST" action="?/update" use:enhance={updateEnhance}>
			<div class="space-y-4">
				<label class="flex flex-col gap-2 text-sm">
					<span class="font-medium text-pink-700">Exercise name</span>
					<input
						type="text"
						name="name"
						bind:value={name}
						class="input"
						placeholder="Bench press"
						required
					/>
				</label>

				<label class="flex flex-col gap-2 text-sm">
					<span class="font-medium text-pink-700">Notes (optional)</span>
					<textarea
						name="notes"
						bind:value={notes}
						rows="4"
						class="input resize-none"
						placeholder="Any notes about this exercise..."
					></textarea>
				</label>
			</div>

			<div class="mt-6 flex gap-4">
				<button
					type="submit"
					class="btn-primary"
					disabled={isSaving}
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
					onclick={() => goto('/exercises')}
					class="btn-secondary"
					disabled={isSaving}
				>
					Cancel
				</button>
			</div>
		</form>
	{/if}
</div>
