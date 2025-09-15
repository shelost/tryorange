<script>
	import { onMount } from 'svelte';
	import { quintOut } from 'svelte/easing';
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';
	import NavigationPill from '$lib/NavigationPill.svelte';

	let step = 1;
	let direction = 1;
	let mbti = '';

	const avatars = [
		{
			id: 'purple',
			src: '/blob-purple.png',
			alt: 'A friendly, purple, blob-like creature with two arms and an antenna.'
		},
		{
			id: 'blue',
			src: '/blob-blue.png',
			alt: 'A friendly, blue, cat-like creature with whiskers.'
		},
		{
			id: 'green',
			src: '/blob-green.png',
			alt: 'A friendly, green, triangular creature with two small horns.'
		}
	];

	let visibleAvatars = [];
	let selectedAvatar = null;
	let showStep1 = true;
	
	const navSteps = ['Welcome', 'Avatar', 'Start'];

	onMount(() => {
		const savedAvatarId = localStorage.getItem('selectedAvatarId');
		if (savedAvatarId) {
			const savedAvatar = avatars.find((a) => a.id === savedAvatarId);
			if (savedAvatar) {
				selectedAvatar = savedAvatar;
			}
		}
	});

	function goToStep(targetStep) {
		if (targetStep < 1 || targetStep > 3) return;
		if (targetStep === step) return;
		
		direction = targetStep > step ? 1 : -1;
		
		step = targetStep;

		showStep1 = step === 1;

		if (step === 2) {
			visibleAvatars = avatars;
			if (!selectedAvatar) {
				selectedAvatar = avatars.find((a) => a.id === 'blue');
			}
		} else if (step === 3 && selectedAvatar) {
			visibleAvatars = [selectedAvatar];
		} else if (step === 1) {
			visibleAvatars = [];
		}
	}

	function selectAvatar(avatar) {
		selectedAvatar = avatar;
		localStorage.setItem('selectedAvatarId', avatar.id);
		visibleAvatars = [avatar];
		setTimeout(() => {
			goToStep(3);
		}, 150);
	}
</script>

<div class="container">
	{#if showStep1}
		<div
			class="step-1"
			in:fade={{ duration: 300 }}
			out:fade={{ duration: 300 }}
			on:outroend={() => (showStep1 = false)}
		>
			<div class="main-content">
				<div class="text-content">
					<h1>Woo, you're down to test my new app! It should only take ~5 minutes.</h1>
				</div>

				<div class="form-section">
					<div class="image-container">
						<img src="/helen-jumpscare.png" alt="A woman making a heart sign with her hand." />
						<p>a heart sign of appreciation from me to you</p>
					</div>
					<div class="input-container">
						<h2>First, what's your MBTI?</h2>
						<div class="input-wrapper">
							<input type="text" bind:value={mbti} maxlength="4" />
							<button on:click={() => goToStep(2)} aria-label="Next step">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="feather feather-arrow-right"
									><line x1="5" y1="12" x2="19" y2="12"></line><polyline
										points="12 5 19 12 12 19"></polyline></svg
								>
							</button>
						</div>
						<a href on:click|preventDefault={() => goToStep(2)}>or maybe you don't know</a>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<div class="step-2-3-container" class:step-2={step === 2} class:step-3={step === 3}>
		{#if step === 2}
			<div
				class="step-2-text"
				in:fade={{ duration: 300, delay: 200 }}
				out:fade={{ duration: 300 }}
			>
				<h2>Awesome... welcome Artist!</h2>
				<p>For the next step, please pick out a starter doodle!</p>
			</div>
		{/if}

		<div class="avatars">
			{#each visibleAvatars as avatar, i (avatar.id)}
				<button
					class="avatar"
					class:selected={selectedAvatar && selectedAvatar.id === avatar.id}
					animate:flip={{ duration: 600, easing: quintOut }}
					in:fly={{ x: direction * 50, delay: 300 + i * 80, duration: 400, easing: quintOut }}
					out:fade={{ duration: 200 }}
					on:click={() => selectAvatar(avatar)}
					disabled={step !== 2}
				>
					<img src={avatar.src} alt={avatar.alt} />
				</button>
			{/each}
		</div>

		{#if step === 3 && selectedAvatar}
			<div
				class="step-3-text"
				in:fade={{ duration: 300, delay: 300 }}
				out:fade={{ duration: 300 }}
			>
				<p class="greeting">
					Yippee, you picked me — your Mote, your guide, I'll walk you through Miso, right by your
					side.
				</p>
				<p>Each story you play is called a Moment, Step in and act just like it's real life. Own it!</p>
				<p>When the Moment ends, you'll get a reflection, Insights about you — your style, your direction.</p>

				<button class="start-button">Let's start &rarr;</button>
			</div>
		{/if}

		{#if step > 1}
			<div class="progress-indicator" transition:fade={{duration: 300, delay: 300}}></div>
		{/if}
	</div>
</div>

<div class="nav-container" transition:fade={{duration: 300}}>
	<NavigationPill
		steps={navSteps}
		currentStep={step - 1}
		disabledSteps={[false, false, !selectedAvatar]}
		on:setStep={(e) => goToStep(e.detail + 1)}
	/>
</div>

<style>
	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
			'Open Sans', 'Helvetica Neue', sans-serif;
		background-color: #fdfdfd;
		color: #333;
	}

	.container {
		display: grid;
		place-items: center;
		min-height: 100vh;
		text-align: center;
		padding: 2rem;
		overflow: hidden;
		box-sizing: border-box;
	}

	.step-1,
	.step-2-3-container {
		grid-column: 1 / -1;
		grid-row: 1 / -1;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	/* --- Step 1 --- */
	.step-1 {
		max-width: 800px;
	}
	
	.main-content {
		width: 100%;
	}

	.text-content h1 {
		font-size: 2.5rem;
		font-weight: 600;
		margin-bottom: 3rem;
	}

	.form-section {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4rem;
	}

	.image-container {
		text-align: center;
        
	}

	.image-container img {
		max-width: 200px;
		border-radius: 16px;
        background: white;
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
	}

	.image-container p {
		font-size: 0.8rem;
		color: #888;
		margin-top: 1rem;
	}

	.input-container {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		text-align: left;
	}

	.input-container h2 {
		font-size: 2rem;
		font-weight: 500;
	}

	.input-wrapper {
		display: flex;
		align-items: center;
		border-bottom: 1px solid #ccc;
		margin-top: 2rem;
	}

	.input-wrapper input {
		border: none;
		outline: none;
		font-size: 1.5rem;
		width: 100px;
		background: transparent;
		text-transform: uppercase;
	}

	.input-wrapper button {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
	}
	
	.input-wrapper button svg {
		transition: transform 0.2s ease-in-out;
	}

	.input-wrapper button:hover svg {
		transform: translateX(4px);
	}

	.input-container a {
		margin-top: 1rem;
		font-size: 0.9rem;
		color: #888;
		text-decoration: none;
	}

	.input-container a:hover {
		text-decoration: underline;
	}

	/* --- Steps 2 & 3 --- */

	.step-2-3-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		width: 100%;
		max-width: 900px;
	}

	.step-2-text h2 {
		font-size: 2.5rem;
		font-weight: 500;
	}

	.step-2-text p {
		font-size: 1.25rem;
		margin-top: 0.5rem;
	}

	.avatars {
		display: flex;
		justify-content: center;
		gap: 2rem;
		margin-top: 2rem;
	}

	.avatar {
		border: none;
		background: none;
		padding: 0;
		cursor: pointer;
		transition: transform 0.3s ease, box-shadow 0.3s ease;
		border-radius: 50%;
	}

	.avatar:hover {
		transform: translateY(-10px) scale(1.05);
	}
	
	.avatar:disabled {
		cursor: default;
	}
	
	.avatar:disabled:hover {
		transform: none;
	}

	.avatar img {
		width: 150px;
		height: 150px;
	}

	/* Step 3 layout adjustments */
	.step-2-3-container.step-3 {
		flex-direction: row;
		align-items: center;
		gap: 5rem;
	}

	.step-2-3-container.step-3 .avatars {
		margin-top: 0;
	}
	
	.step-2-3-container.step-3 .avatar img {
		width: 200px;
		height: 200px;
	}

	.step-3-text {
		text-align: left;
		max-width: 400px;
	}
	
	.step-3-text p {
		font-size: 1.1rem;
		line-height: 1.6;
		margin-bottom: 1.5rem;
	}
	
	.step-3-text .greeting {
		font-size: 1.5rem;
		font-weight: 500;
		line-height: 1.4;
	}

	.start-button {
		font-size: 1.25rem;
		font-weight: 500;
		color: #555;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: color 0.2s;
	}

	.start-button:hover {
		color: #000;
	}

	.progress-indicator {
		width: 40px;
		height: 4px;
		background-color: #ddd;
		border-radius: 2px;
		position: absolute;
		bottom: 2rem;
	}
	
	.nav-container {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
	}

	/* --- Responsive --- */
	@media (max-width: 768px) {
		.form-section {
			flex-direction: column;
			gap: 2rem;
		}

		.step-2-3-container.step-3 {
			flex-direction: column;
			gap: 2rem;
			text-align: center;
		}
		
		.step-3-text {
			text-align: center;
		}
	}
</style>
