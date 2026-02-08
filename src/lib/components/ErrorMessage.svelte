<script lang="ts">
	let { message = 'Something went wrong' } = $props();
</script>

<div class="relative mb-6 overflow-hidden rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
	<div class="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-red-100 opacity-50"></div>
	<div class="relative flex items-start gap-3">
		<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100">
			<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
		</div>
		<div>
			<p class="font-medium">Oops!</p>
			<p class="text-sm opacity-90">{message}</p>
		</div>
	</div>
</div>
