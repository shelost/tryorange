<script>
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/orange-gradient.png" />
</svelte:head>

{@render children?.()}
