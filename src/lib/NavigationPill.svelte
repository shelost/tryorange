<script>
	import { createEventDispatcher } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	export let steps = [];
	export let currentStep = 0;
	export let disabledSteps = [];

	const dispatch = createEventDispatcher();

	const clipPath = tweened(
		{ left: 0, right: 0 },
		{
			duration: 400,
			easing: cubicOut
		}
	);

	$: {
		const numSteps = steps.length;
		if (numSteps > 0) {
			const leftPercent = (100 / numSteps) * currentStep;
			const rightPercent = 100 - (100 / numSteps) * (currentStep + 1);
			clipPath.set({ left: leftPercent, right: rightPercent });
		}
	}

	function handleClick(index) {
		if (!disabledSteps[index]) {
			dispatch('setStep', index);
		}
	}
</script>

<nav class="pill-nav">
	<div
		class="pill-background"
		style="clip-path: inset(0 {$clipPath.right}% 0 {$clipPath.left}% round 999px);"
	></div>
	<div class="step-labels">
		{#each steps as step, i}
			<button
				class="step-label"
				class:active={currentStep === i}
				on:click={() => handleClick(i)}
				disabled={disabledSteps[i]}
			>
				{step}
			</button>
		{/each}
	</div>
</nav>

<style>

	.pill-nav {
		position: relative;
		display: inline-flex;
		background-color: #e5e7eb;
		border-radius: 999px;
		padding: 4px;
		min-width: 280px;
	}

	.pill-background {
		position: absolute;
		top: 4px;
		left: 4px;
		right: 4px;
		bottom: 4px;
		background-color: white;
		box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
		border-radius: 999px;
	}

	.step-labels {
		display: contents;
	}

	.step-label {
		flex: 1;
		border: none;
		background: none;
		padding: 8px 12px;
		border-radius: 50px;
		color: #4b5563;
		font-weight: 500;
		cursor: pointer;
		position: relative;
		z-index: 1;
		transition: color 0.3s ease;

		font-family: 'Inter', serif;
		letter-spacing: -0.25px;
		font-weight: 500;
	}

	.step-label.active {
		color: #111827;
	}

	.step-label:disabled {
		color: #9ca3af;
		cursor: not-allowed;
	}
</style>
