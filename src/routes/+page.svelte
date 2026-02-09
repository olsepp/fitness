<script lang="ts">
	import type { WorkoutSession } from '$lib/types';
	import ErrorMessage from '$lib/components/ErrorMessage.svelte';
	import { SvelteDate } from 'svelte/reactivity';


	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY } from '$env/static/public';

	// This will run in the browser
	console.log('=== ENVIRONMENT CHECK ===');
	console.log('URL:', PUBLIC_SUPABASE_URL);
	console.log('Key exists:', !!PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
	console.log('Key length:', PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.length);
	console.log('=========================');


	let { data } = $props();
	let workouts: WorkoutSession[] = $derived(data.workouts || []);
	let errorMessage = $state<string | null>(null);

	// Stats
	let totalWorkouts = $derived(workouts.length);
	let completedWorkouts = $derived(workouts.filter((w) => w.is_completed).length);
	let pendingWorkouts = $derived(workouts.filter((w) => !w.is_completed).length);

	// This week's workouts
	let thisWeekWorkouts = $derived.by(() => {
		const now = new Date();
		const weekStart = new SvelteDate(now);
		weekStart.setDate(now.getDate() - now.getDay());
		weekStart.setHours(0, 0, 0, 0);
		return workouts.filter((w) => new Date(w.date) >= weekStart);
	});

	// This month's workouts
	let thisMonthWorkouts = $derived.by(() => {
		const now = new Date();
		return workouts.filter((w) => {
			const workoutDate = new Date(w.date);
			return workoutDate.getMonth() === now.getMonth() && workoutDate.getFullYear() === now.getFullYear();
		});
	});

	// Recent workouts (last 5)
	let recentWorkouts = $derived(workouts.slice(0, 5));

	// Most common workout type
	let mostCommonType = $derived.by(() => {
		const typeCounts: Record<string, number> = {};
		workouts.forEach((w) => {
			if (w.workout_type) {
				typeCounts[w.workout_type.name] = (typeCounts[w.workout_type.name] || 0) + 1;
			}
		});
		return Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
	});

	function getWeekDates(): { date: Date; day: string; isToday: boolean; hasWorkout: boolean }[] {
		const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		const today = new Date();
		const result = [];

		for (let i = 0; i < 7; i++) {
			const date = new Date(today);
			date.setDate(today.getDate() - today.getDay() + i);
			const dateStr = date.toISOString().split('T')[0];
			const hasWorkout = workouts.some((w) => w.date === dateStr);

			result.push({
				date,
				day: days[date.getDay()],
				isToday: date.toDateString() === today.toDateString(),
				hasWorkout,
			});
		}

		return result;
	}

	let weekDates = $derived(getWeekDates());

	function getTotalExercises(workout: WorkoutSession): number {
		return workout.workout_exercise?.length || 0;
	}
</script>

<div class="mx-auto max-w-5xl space-y-6 p-4">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="font-display text-3xl font-semibold text-pink-900">Your Fitness Journey 💖</h1>
			<p class="mt-1 text-pink-500">Track your progress and crush your goals!</p>
		</div>
		<a href="/workout/new" class="btn-primary">
			<svg class="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
			New Workout
		</a>
	</header>

	{#if errorMessage}
		<div class="mt-4">
			<ErrorMessage message={errorMessage} />
		</div>
	{/if}

	<!-- Stats Grid -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div class="relative overflow-hidden rounded-2xl border border-pink-200/60 bg-white/60 p-6 backdrop-blur-sm shadow-lg shadow-pink-500/10">
			<div class="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-pink-200/50"></div>
			<p class="text-sm font-medium text-pink-500">Total Workouts</p>
			<p class="mt-2 font-display text-4xl font-bold text-pink-700">{totalWorkouts}</p>
			<p class="mt-1 text-xs text-pink-400">All time ✨</p>
		</div>

		<div class="relative overflow-hidden rounded-2xl border border-pink-200/60 bg-white/60 p-6 backdrop-blur-sm shadow-lg shadow-pink-500/10">
			<div class="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-mauve-200/50"></div>
			<p class="text-sm font-medium text-pink-500">This Week</p>
			<p class="mt-2 font-display text-4xl font-bold text-pink-700">{thisWeekWorkouts.length}</p>
			<p class="mt-1 text-xs text-pink-400">
				{thisWeekWorkouts.filter((w) => w.is_completed).length} completed 🌟
			</p>
		</div>

		<div class="relative overflow-hidden rounded-2xl border border-pink-200/60 bg-white/60 p-6 backdrop-blur-sm shadow-lg shadow-pink-500/10">
			<div class="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-berry-200/50"></div>
			<p class="text-sm font-medium text-pink-500">This Month</p>
			<p class="mt-2 font-display text-4xl font-bold text-pink-700">{thisMonthWorkouts.length}</p>
			<p class="mt-1 text-xs text-pink-400">
				{thisMonthWorkouts.filter((w) => w.is_completed).length} completed 💪
			</p>
		</div>

		<div class="relative overflow-hidden rounded-2xl border border-pink-200/60 bg-white/60 p-6 backdrop-blur-sm shadow-lg shadow-pink-500/10">
			<div class="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blush-300/50"></div>
			<p class="text-sm font-medium text-pink-500">Favorite Type</p>
			<p class="mt-2 font-display text-4xl font-bold text-pink-700">{mostCommonType}</p>
			<p class="mt-1 text-xs text-pink-400">Most frequent 💕</p>
		</div>
	</div>

	<!-- Week Calendar -->
	<div class="card p-4 sm:p-6">
		<h2 class="mb-3 sm:mb-4 font-display text-base sm:text-lg font-semibold text-pink-800">This Week 📅</h2>
		<div class="flex justify-between gap-1 min-w-0 overflow-hidden">
			{#each weekDates as day}
				<div class="flex flex-1 flex-col items-center gap-1 min-w-0">
					<span class="text-xs font-medium text-pink-400 truncate max-w-[2rem]">{day.day}</span>
					<div
						class="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs sm:text-sm font-medium transition-all flex-shrink-0
						{day.isToday
							? 'bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/30'
							: day.hasWorkout
								? 'bg-gradient-to-br from-mauve-400 to-mauve-500 text-white'
								: 'bg-pink-50 text-pink-400'}"
					>
						{day.date.getDate()}
					</div>
					{#if day.hasWorkout}
						<div class="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse-soft"></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Recent Workouts -->
		<div class="card p-6">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="font-display text-lg font-semibold text-pink-800">Recent Workouts 📋</h2>
				<a href="/history" class="text-sm font-medium text-pink-500 hover:text-pink-600">View All →</a>
			</div>

			{#if recentWorkouts.length === 0}
				<div class="py-8 text-center">
					<div class="mb-4 flex justify-center">
						<div class="flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 text-3xl">💪</div>
					</div>
					<p class="text-pink-500">No workouts yet</p>
					<a href="/workout/new" class="mt-2 inline-block text-sm font-medium text-pink-600 hover:text-pink-700">
						Start your first workout →
					</a>
				</div>
			{:else}
				<div class="space-y-3">
					{#each recentWorkouts as workout}
						<a
							href="/workout/{workout.id}"
							class="group flex items-center gap-4 rounded-xl border border-pink-100 bg-pink-50/50 p-4 transition-all hover:border-pink-300 hover:bg-pink-100"
						>
							<div
								class="flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110
								{workout.is_completed ? 'bg-gradient-to-br from-green-100 to-green-200' : 'bg-gradient-to-br from-yellow-100 to-yellow-200'}"
							>
								{#if workout.is_completed}
									<svg class="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
										<polyline points="20 6 9 17 4 12" />
									</svg>
								{:else}
									<svg class="h-5 w-5 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
										<circle cx="12" cy="12" r="10" />
										<polyline points="12 6 12 12 16 14" />
									</svg>
								{/if}
							</div>
							<div class="flex-1">
								<p class="font-semibold text-pink-800">
									{workout.workout_type?.name || 'Unknown Type'}
								</p>
								<p class="text-xs text-pink-400">
									{new Date(workout.date).toLocaleDateString('en-US', {
										month: 'short',
										day: 'numeric',
									})}
									{#if workout.workout_exercise}
										<span class="text-pink-300">·</span>
										{getTotalExercises(workout)} exercise{getTotalExercises(workout) === 1 ? '' : 's'}
									{/if}
								</p>
							</div>
							<span class="badge {workout.is_completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
								{workout.is_completed ? 'Done' : 'In Progress'}
							</span>
						</a>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Progress -->
		<div class="card p-6">
			<h2 class="mb-4 font-display text-lg font-semibold text-pink-800">Progress 📈</h2>

			<div class="space-y-6">
				<!-- Completion Rate -->
				<div>
					<div class="mb-2 flex justify-between text-sm">
						<span class="font-medium text-pink-600">Completion Rate</span>
						<span class="font-semibold text-pink-700">
							{totalWorkouts > 0
								? Math.round((completedWorkouts / totalWorkouts) * 100)
								: 0}%
						</span>
					</div>
					<div class="h-3 overflow-hidden rounded-full bg-pink-100">
						<div
							class="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-500 transition-all"
							style="width: {totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0}%"
						></div>
					</div>
				</div>

				<!-- Pending vs Completed -->
				<div>
					<div class="mb-2 text-sm font-medium text-pink-600">Workout Status</div>
					<div class="flex h-10 overflow-hidden rounded-xl bg-pink-100">
						<div
							class="flex items-center justify-center bg-gradient-to-r from-pink-400 to-pink-500 text-xs font-semibold text-white"
							style="width: {totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0}%"
						>
							{completedWorkouts} ✓
						</div>
						<div
							class="flex items-center justify-center bg-pink-200 text-xs font-semibold text-pink-600"
							style="width: {totalWorkouts > 0 ? (pendingWorkouts / totalWorkouts) * 100 : 0}%"
						>
							{pendingWorkouts} ◐
						</div>
					</div>
					<div class="mt-3 flex gap-4 text-xs">
						<span class="flex items-center gap-1.5 font-medium text-pink-500">
							<span class="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-pink-400 to-pink-500"></span>
							Completed ({completedWorkouts})
						</span>
						<span class="flex items-center gap-1.5 font-medium text-pink-400">
							<span class="h-2.5 w-2.5 rounded-full bg-pink-200"></span>
							Pending ({pendingWorkouts})
						</span>
					</div>
				</div>

				<!-- Quick Actions -->
				<div>
					<div class="mb-3 text-sm font-medium text-pink-600">Quick Actions</div>
					<div class="flex flex-wrap gap-2">
						<a href="/workout/new" class="btn-primary text-sm">
							+ New Workout
						</a>
						<a href="/history" class="btn-secondary text-sm">
							View History
						</a>
						<a href="/exercises" class="btn-ghost text-sm">
							Exercises
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Motivational Message -->
	{#if totalWorkouts > 0}
		<div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-100 via-mauve-100 to-pink-100 p-6 text-center">
			<div class="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-pink-200 opacity-50 blur-2xl"></div>
			<div class="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-mauve-200 opacity-50 blur-2xl"></div>
			<p class="relative text-lg font-medium text-pink-800">
				{#if completedWorkouts === totalWorkouts}
					🎉 Perfect! You've completed all your workouts! You're amazing!
				{:else if pendingWorkouts === 0}
					🌟 Great job! All caught up! Ready for more?
				{:else if thisWeekWorkouts.length >= 5}
					🔥 You're on fire! 5+ workouts this week! Keep shining!
				{:else if totalWorkouts >= 10}
					💪 {totalWorkouts} workouts logged. You're unstoppable!
				{:else}
					💖 Start your next workout and keep building momentum!
				{/if}
			</p>
		</div>
	{:else}
		<div class="relative overflow-hidden rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/50 p-8 text-center">
			<div class="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-pink-100 opacity-50 blur-2xl"></div>
			<div class="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-mauve-100 opacity-50 blur-2xl"></div>
			<div class="relative">
				<div class="mb-4 flex justify-center">
					<div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-pink-500 text-4xl shadow-lg shadow-pink-500/30">💪</div>
				</div>
				<p class="text-lg font-medium text-pink-700">Ready to start your fitness journey?</p>
				<p class="mt-1 text-sm text-pink-500">Let's crush those goals together!</p>
				<a href="/workout/new" class="btn-primary mt-4 inline-flex">
					Create Your First Workout
				</a>
			</div>
		</div>
	{/if}
</div>
