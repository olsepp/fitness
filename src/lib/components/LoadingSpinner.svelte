<script lang="ts">
	type Size = 'sm' | 'md' | 'lg';
	let { size = 'md' }: { size?: Size } = $props();

	const sizeClasses: Record<Size, string> = {
		sm: 'h-4 w-4 border-2',
		md: 'h-8 w-8 border-3',
		lg: 'h-12 w-12 border-4'
	};
</script>

<div class="flex items-center justify-center">
	<div
		class="spinner-pink {sizeClasses[size]}"
		role="status"
		aria-label="Loading"
	></div>
</div>
