<script lang="ts">
	import type { ActionData } from './$types';

	let { form } = $props<{ form: ActionData }>();
</script>

<section class="mx-auto flex w-full max-w-md flex-col gap-6">
	<header class="text-center">
		<div class="mb-4 flex justify-center">
			<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 shadow-lg shadow-pink-500/30">
				<svg class="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
					<circle cx="12" cy="7" r="4" />
				</svg>
			</div>
		</div>
		<h2 class="font-display text-2xl font-semibold text-pink-900">Welcome Back! 💖</h2>
		<p class="mt-2 text-sm text-pink-500">Sign in to continue your fitness journey</p>
	</header>

	<form 
		method="POST" 
		class="relative overflow-hidden rounded-2xl border border-pink-200 bg-white/80 p-6 shadow-lg shadow-pink-500/10"
	>
		<div class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-pink-100 opacity-50 blur-2xl"></div>
		<div class="absolute -left-10 -bottom-10 h-24 w-24 rounded-full bg-mauve-100 opacity-50 blur-2xl"></div>
		
		<div class="relative flex flex-col gap-4">
			<label class="flex flex-col gap-2 text-sm">
				<span class="font-medium text-pink-700">Email</span>
				<input
					type="email"
					name="email"
					class="input"
					placeholder="you@example.com"
					value={form?.email ?? ''}
					required
				/>
			</label>
			<label class="flex flex-col gap-2 text-sm">
				<span class="font-medium text-pink-700">Password</span>
				<input
					type="password"
					name="password"
					class="input"
					placeholder="••••••••"
					required
				/>
			</label>
		</div>
		<div class="mt-6 flex flex-col gap-3">
			<button
				type="submit"
				class="btn-primary w-full"
			>
				Sign In
			</button>
			{#if form?.error}
				<div class="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
					{form.error}
				</div>
			{/if}
		</div>
	</form>
	
	<p class="text-center text-sm text-pink-400">
		Ready to crush your goals? Let's go! ✨
	</p>
</section>
