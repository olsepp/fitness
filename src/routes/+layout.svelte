<script lang="ts">
	import './layout.css';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';

	let { data, children } = $props<{ data: { session: Session | null } }>();
	let session = $state<Session | null>(data.session);
	let menuOpen = $state(false);

	// Keep session in sync when data changes (e.g., after sign-in)
	$effect(() => {
		session = data.session;
	});

	// Listen for auth state changes
	onMount(() => {
		const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
			session = newSession;
		});

		return () => {
			subscription.unsubscribe();
		};
	});

	function closeMenu() {
		menuOpen = false;
	}

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function handleSignOut() {
		menuOpen = false;
		window.location.href = '/sign-out';
	}
</script>



<div class="min-h-screen bg-blush-50 text-pink-900">
	{#if session}
		<!-- Decorative gradient header -->
		<header class="relative overflow-hidden border-b border-pink-200 bg-white/80 backdrop-blur-md">
			<!-- Subtle pattern overlay -->
			<div class="absolute inset-0 opacity-30" style="background-image: radial-gradient(circle at 20% 80%, rgba(233, 30, 140, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(233, 30, 140, 0.08) 0%, transparent 50%);"></div>
			
			<div class="relative flex items-center justify-between px-4 py-3 sm:py-4 gap-3 sm:gap-4">
				<button
					class="hamburger-btn lg:hidden rounded-xl border border-pink-200 bg-pink-50/80 p-2.5 sm:p-2 text-pink-600 transition-all duration-200 hover:border-pink-300 hover:bg-pink-100 hover:shadow-md hover:shadow-pink-200/50 active:scale-95 flex-shrink-0 backdrop-blur-sm"
					class:is-open={menuOpen}
					aria-label="Toggle navigation"
					aria-expanded={menuOpen}
					onclick={toggleMenu}
				>
					<span class="hamburger-icon" aria-hidden="true">
						<span class="bar bar-top"></span>
						<span class="bar bar-mid"></span>
						<span class="bar bar-bot"></span>
					</span>
				</button>
				<h1 class="relative text-base sm:text-xl font-semibold tracking-tight flex-1 text-center">
					<span class="gradient-text font-display">Fitness Tracker</span>
				</h1>
				<a
					href="/workout/new"
					class="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 flex-shrink-0"
				>
					<svg class="mr-1.5 sm:mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					<span class="hidden xs:inline">New Workout</span>
					<span class="xs:hidden">New</span>
				</a>
			</div>
		</header>

		<!-- Mobile Slide-in Menu -->
		{#if menuOpen}
			<!-- Overlay backdrop with fade-in animation -->
			<div
				class="fixed inset-0 z-40 bg-pink-900/30 backdrop-blur-sm lg:hidden animate-fade-in"
				onclick={closeMenu}
				onkeydown={(e) => e.key === 'Escape' && closeMenu()}
				role="button"
				tabindex="0"
				aria-label="Close menu"
			></div>

			<!-- Slide-in menu panel with slide animation -->
			<nav
				class="fixed inset-y-0 left-0 z-50 w-80 transform border-r border-pink-200 bg-white/95 backdrop-blur-xl shadow-pink-xl lg:hidden animate-slide-in"
			>
				<!-- Menu Header -->
				<div class="relative overflow-hidden border-b border-pink-100 bg-gradient-to-r from-pink-50 to-white px-5 py-5">
					<div class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-pink-100/50 blur-2xl"></div>
					<div class="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-mauve-100/50 blur-2xl"></div>
					
					<div class="relative flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-pink-600 shadow-lg shadow-pink-500/30">
								<svg
									class="h-5 w-5 text-white"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
									<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
								</svg>
							</div>
							<div>
								<h2 class="text-lg font-semibold text-pink-900">Menu</h2>
								<p class="text-xs text-pink-500">Welcome back! ✨</p>
							</div>
						</div>
						<button
							class="rounded-lg p-2 text-pink-400 transition-all hover:bg-pink-50 hover:text-pink-600 active:scale-95"
							onclick={closeMenu}
							aria-label="Close menu"
						>
							<svg
								class="h-5 w-5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</div>
				</div>

				<!-- Menu Items -->
				<ul class="flex flex-col gap-2 px-3 py-4">
					<li>
						<a
							class="group flex items-center gap-3 rounded-xl border border-pink-100 bg-pink-50/50 px-4 py-3.5 text-pink-700 transition-all hover:border-pink-300 hover:bg-pink-100 hover:shadow-md"
							href="/"
							onclick={closeMenu}
						>
							<span class="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm text-xl transition-all group-hover:scale-110">🏠</span>
							<span class="font-semibold">Home</span>
							<svg
								class="ml-auto h-4 w-4 text-pink-300 transition-transform group-hover:translate-x-1"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="9 18 15 12 9 6" />
							</svg>
						</a>
					</li>
					<li>
						<a
							class="group flex items-center gap-3 rounded-xl border border-pink-100 bg-pink-50/50 px-4 py-3.5 text-pink-700 transition-all hover:border-pink-300 hover:bg-pink-100 hover:shadow-md"
							href="/history"
							onclick={closeMenu}
						>
							<span class="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm text-xl transition-all group-hover:scale-110">📋</span>
							<span class="font-semibold">History</span>
							<svg
								class="ml-auto h-4 w-4 text-pink-300 transition-transform group-hover:translate-x-1"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="9 18 15 12 9 6" />
							</svg>
						</a>
					</li>
					<li>
						<a
							class="group flex items-center gap-3 rounded-xl border border-pink-100 bg-pink-50/50 px-4 py-3.5 text-pink-700 transition-all hover:border-pink-300 hover:bg-pink-100 hover:shadow-md"
							href="/exercises"
							onclick={closeMenu}
						>
							<span class="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm text-xl transition-all group-hover:scale-110">💪</span>
							<span class="font-semibold">Exercises</span>
							<svg
								class="ml-auto h-4 w-4 text-pink-300 transition-transform group-hover:translate-x-1"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="9 18 15 12 9 6" />
							</svg>
						</a>
					</li>

					<!-- Sign Out Button -->
					<li class="mt-4">
					<button
						class="group flex w-full items-center gap-3 rounded-xl border border-red-200 bg-red-50/50 px-4 py-3.5 text-red-600 transition-all hover:border-red-300 hover:bg-red-100"
						onclick={handleSignOut}
					>
							<span class="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm text-xl transition-all group-hover:scale-110">🚪</span>
							<span class="font-semibold">Sign Out</span>
						</button>
					</li>
				</ul>

				<!-- Menu Footer -->
				<div class="absolute bottom-0 left-0 right-0 border-t border-pink-100 bg-pink-50/80 px-5 py-4">
					<p class="flex items-center justify-center gap-1 text-xs text-pink-400">
						<span>Fitness Tracker</span>
						<span class="text-pink-300">•</span>
						<span>v1.0</span>
						<span class="text-pink-300">•</span>
						<span>Made with 💖</span>
					</p>
				</div>
			</nav>
		{/if}

		<div class="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6 lg:px-8">
			<aside class="hidden w-64 shrink-0 lg:block">
				<nav class="sticky top-4 rounded-2xl border border-pink-200 bg-white/80 backdrop-blur-xl shadow-lg shadow-pink-500/10">
					<ul class="flex flex-col gap-1 p-3">
						<li>
							<a class="group flex items-center gap-3 rounded-xl px-4 py-3 text-pink-600 transition-all hover:bg-pink-50" href="/">
								<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50 text-lg transition-all group-hover:scale-110 group-hover:bg-pink-100">🏠</span>
								<span class="font-semibold">Home</span>
							</a>
						</li>
						<li>
							<a class="group flex items-center gap-3 rounded-xl px-4 py-3 text-pink-600 transition-all hover:bg-pink-50" href="/history">
								<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50 text-lg transition-all group-hover:scale-110 group-hover:bg-pink-100">📋</span>
								<span class="font-semibold">History</span>
							</a>
						</li>
						<li>
							<a class="group flex items-center gap-3 rounded-xl px-4 py-3 text-pink-600 transition-all hover:bg-pink-50" href="/exercises">
								<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50 text-lg transition-all group-hover:scale-110 group-hover:bg-pink-100">💪</span>
								<span class="font-semibold">Exercises</span>
							</a>
						</li>
						<li class="pt-2">
					<button
						class="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-red-500 transition-all hover:bg-red-50"
						onclick={handleSignOut}
					>
								<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-lg transition-all group-hover:scale-110 group-hover:bg-red-100">🚪</span>
								<span class="font-semibold">Sign Out</span>
							</button>
						</li>
					</ul>
				</nav>
			</aside>

			<main class="min-w-0 flex-1">
				<div class="relative rounded-2xl border border-pink-200 bg-white/60 shadow-lg shadow-pink-500/10 p-6 lg:p-8">
					{@render children()}
				</div>
			</main>
		</div>
	{:else}
		<!-- Unauthenticated state - show only the page content (sign-in form) -->
		<main class="flex min-h-screen items-center justify-center p-4">
			<div class="relative w-full max-w-md">
				<!-- Decorative elements -->
				<div class="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-100/50 blur-3xl"></div>
				<div class="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-mauve-100/50 blur-3xl"></div>
				
				<div class="relative rounded-2xl border border-pink-200 bg-white/80 backdrop-blur-xl shadow-pink-xl p-8">
					{@render children()}
				</div>
			</div>
		</main>
	{/if}
</div>

<style>
	@keyframes slide-in {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(0);
		}
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.animate-slide-in {
		animation: slide-in 0.3s ease-out forwards;
	}

	.animate-fade-in {
		animation: fade-in 0.2s ease-out forwards;
	}

	/* ── Modern animated hamburger icon ── */
	.hamburger-icon {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 20px;
		height: 20px;
		gap: 0;
		position: relative;
	}

	.bar {
		display: block;
		width: 18px;
		height: 2px;
		border-radius: 2px;
		background: currentColor;
		position: absolute;
		transition:
			transform 0.35s cubic-bezier(0.23, 1, 0.32, 1),
			opacity 0.25s ease,
			top 0.35s cubic-bezier(0.23, 1, 0.32, 1),
			width 0.35s cubic-bezier(0.23, 1, 0.32, 1);
		transform-origin: center;
	}

	/* Resting positions */
	.bar-top { top: 4px; }
	.bar-mid { top: 9px; }
	.bar-bot { top: 14px; width: 12px; }   /* shorter bottom bar for modern look */

	/* Open (X) state */
	.hamburger-btn.is-open .bar-top {
		top: 9px;
		transform: rotate(45deg);
	}
	.hamburger-btn.is-open .bar-mid {
		opacity: 0;
		transform: scaleX(0);
	}
	.hamburger-btn.is-open .bar-bot {
		top: 9px;
		width: 18px;
		transform: rotate(-45deg);
	}
</style>
