<script>
	import { onMount } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { profileData } from '$lib/scaled_profiles.js';
	import { colorProfiles } from '$lib/colors.js';

	class Dot {
		constructor(x, y, index) {
			this.currentX = x;
			this.currentY = y;
			this.displayX = x;
			this.displayY = y;
			this.targetX = x;
			this.targetY = y;
			this.vx = 0;
			this.vy = 0;
			this.index = index;
			this.radius = parseFloat(getComputedStyle(canvas).getPropertyValue('--dot-radius')) || 2.5;
			this.animationProgress = 1;
			this.transitionDuration = 800;
			this.transitionStartTime = 0;
		}

		setTarget(x, y) {
			this.targetX = x;
			this.targetY = y;
			this.animationProgress = 0;
			this.transitionStartTime = Date.now();
		}

		update() {
			if (this.animationProgress < 1) {
				const elapsed = Date.now() - this.transitionStartTime;
				this.animationProgress = Math.min(1, elapsed / this.transitionDuration);
				
				// Cubic easing out
				const progress = 1 - Math.pow(1 - this.animationProgress, 3);
				
				this.currentX = this.currentX + (this.targetX - this.currentX) * progress * 0.1;
				this.currentY = this.currentY + (this.targetY - this.currentY) * progress * 0.1;
			}
		}

		updateDisplayPosition(mouse) {
			// Attraction force towards the dot's actual position in the shape
			const ax = (this.currentX - this.displayX) * 0.01;
			const ay = (this.currentY - this.displayY) * 0.01;
			this.vx += ax;
			this.vy += ay;

			// Repulsion force from the mouse
			let isRepelling = false;
			if (mouse.x !== undefined) {
				const dx = this.displayX - mouse.x;
				const dy = this.displayY - mouse.y;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist < mouse.radius) {
					isRepelling = true;
					const force = (mouse.radius - dist) / mouse.radius;
					const angle = Math.atan2(dy, dx);
					this.vx += Math.cos(angle) * force * 2;
					this.vy += Math.sin(angle) * force * 2;
				}
			}
			
			// Apply damping/friction to the velocity
			this.vx *= 0.9;
			this.vy *= 0.9;

			// Update the display position with the new velocity
			this.displayX += this.vx;
			this.displayY += this.vy;

			return isRepelling;
		}

		draw(ctx) {
			ctx.beginPath();
			ctx.arc(this.displayX, this.displayY, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'black';
			ctx.fill();
			
			// Add subtle glow
			ctx.shadowBlur = 32;
			ctx.shadowColor = currentTheme.color;
			ctx.fill(); // Fill again to apply shadow
			ctx.shadowBlur = 0; // Reset shadow for other elements
		}
	}

	// Animation state
	let canvas;
	let ctx;
	let interactionCanvas;
	let interactionCtx;
	let animationId;
	let dots = [];
	let mouse = { x: undefined, y: undefined, clientX: undefined, clientY: undefined, radius: 100 };
	let cursorShape = tweened({ rx: 10, ry: 10, lineWidth: 1.5 }, { duration: 300, easing: cubicOut });
	let isInputHovered = false;
	let isButtonHovered = false;
	let currentColorIndex = 0;
	$: currentTheme = colorProfiles[currentColorIndex];
	let currentProfileIndex = 0;
	let isTouchDevice = false;
	$: if (isTouchDevice && typeof document !== 'undefined') {
		document.body.classList.add('touch-device');
	}
	let profileChangeTimer = 0;
	const profileChangeDuration = 2500; 
	let profiles = [];
	let emailInput;

	function initializeDots() {
		dots = [];
		if (profiles.length === 0) return;
		const initialProfile = profiles[0];
		
		for (let i = 0; i < 100; i++) {
			const point = initialProfile[i] || { x: 200, y: 200 };
			const dot = new Dot(point.x, point.y, i);
			dots.push(dot);
		}
	}

	function changeProfile() {
		currentProfileIndex = (currentProfileIndex + 1) % profiles.length;
		const newProfile = profiles[currentProfileIndex];

		// Set new targets for all dots simultaneously
		dots.forEach((dot, index) => {
			const point = newProfile[index] || { x: 200, y: 200 };
			dot.setTarget(point.x, point.y);
		});

		profileChangeTimer = 0;
	}

	function drawConnectingLines(ctx) {
		if (dots.length < 2) return;
		
		ctx.beginPath();
		ctx.moveTo(dots[0].displayX, dots[0].displayY);
		
		for (let i = 1; i < dots.length; i++) {
			ctx.lineTo(dots[i].displayX, dots[i].displayY);
		}
		
		// Connect back to first dot to close the shape
		ctx.lineTo(dots[0].displayX, dots[0].displayY);
		
		ctx.strokeStyle = 'rgba(255, 107, 71, 0.1)';
        ctx.strokeStyle = 'black';
		ctx.lineWidth = 1;
		//ctx.stroke();
	}

	function animate() {
		if (!canvas || !ctx) return;

		// Clear canvas with subtle gradient background
		const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
		gradient.addColorStop(0, '#f8f9fa');
		gradient.addColorStop(1, '#e9ecef');
		ctx.fillStyle = gradient;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (interactionCtx) {
			interactionCtx.clearRect(0, 0, interactionCanvas.width, interactionCanvas.height);
		}

		// Update profile change timer
		profileChangeTimer += 16; // Assuming ~60fps
		if (profileChangeTimer >= profileChangeDuration) {
			changeProfile();
		}

		// Update dot positions first
		let isRepelling = false;
		dots.forEach(dot => {
			dot.update();
			if (dot.updateDisplayPosition(mouse)) {
				isRepelling = true;
			}
		});

		if (isInputHovered) {
			cursorShape.set({ rx: 0.1, ry: 10, lineWidth: 5 });
		} else {
			const radius = isRepelling ? 20 : 10;
			cursorShape.set({ rx: radius, ry: radius, lineWidth: 5 });
		}

		// Then draw everything with the final positions
		drawConnectingLines(ctx);
		
		dots.forEach(dot => {
			dot.draw(ctx);
		});

		// Draw custom cursor
		if (interactionCtx && mouse.clientX !== undefined) {
			interactionCtx.beginPath();
			interactionCtx.ellipse(mouse.clientX, mouse.clientY, $cursorShape.rx, $cursorShape.ry, 0, 0, 2 * Math.PI);
			interactionCtx.strokeStyle = isButtonHovered ? 'white' : currentTheme.color;
			interactionCtx.lineWidth = $cursorShape.lineWidth;
			interactionCtx.stroke();
		}

		animationId = requestAnimationFrame(animate);
	}

	function resizeCanvas() {
		if (!canvas || !ctx) return;
		
		const scaleFactor = 2; // For high-DPI rendering
		const size = Math.min(window.innerWidth, window.innerHeight) * 0.9;

		// Set display size via CSS
		canvas.style.width = `${size}px`;
		canvas.style.height = `${size}px`;
		
		// Set actual canvas resolution (backing store)
		canvas.width = size * scaleFactor;
		canvas.height = size * scaleFactor;
		
		// Scale the context to match the display size
		ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);

		if (interactionCanvas) {
			interactionCanvas.width = window.innerWidth * scaleFactor;
			interactionCanvas.height = window.innerHeight * scaleFactor;
			interactionCtx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
		}

		// Recalculate scaled profiles based on the new size
		const profileScale = size / 1000; // Original profiles are in a 1000x1000 box
		profiles = JSON.parse(JSON.stringify(profileData)).map(profile =>
			profile.map(point => ({
				x: point.x * profileScale,
				y: point.y * profileScale
			}))
		);
		
		// Reinitialize dots with new scaled coordinates
		initializeDots();
	}

    let email = "";
	let isSubmitting = false;

  async function joinWaitlist() {
	isSubmitting = true;
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert("You're on the waitlist!");
        email = "";
      } else {
        alert(result.error || "Failed to join waitlist. Please try again.");
      }
    } catch (error) {
      console.error("Error joining waitlist:", error);
      alert("Failed to join waitlist. Please try again.");
    } finally {
		isSubmitting = false;
	}
	}

	onMount(() => {
		ctx = canvas.getContext('2d');
		interactionCtx = interactionCanvas.getContext('2d');
		
		const handleFirstTouch = () => {
			isTouchDevice = true;
			window.removeEventListener('touchstart', handleFirstTouch);
		};
		window.addEventListener('touchstart', handleFirstTouch, { once: true });
		
		const handleViewportResize = () => {
			if (document.activeElement === emailInput) {
				setTimeout(() => {
					emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}, 20);
			}
		};
		
		if (window.visualViewport) {
			window.visualViewport.addEventListener('resize', handleViewportResize);
		}
		
		const handleMouseMove = (event) => {
			if (isTouchDevice) return;
			const rect = canvas.getBoundingClientRect();
			
			// Translate mouse coordinates from screen space to canvas space
			const scaleX = canvas.width / (rect.width * 2); // 2 is scaleFactor
			const scaleY = canvas.height / (rect.height * 2);

			mouse.x = (event.clientX - rect.left) * scaleX;
			mouse.y = (event.clientY - rect.top) * scaleY;
			mouse.clientX = event.clientX;
			mouse.clientY = event.clientY;
		};

		const handleMouseLeave = () => {
			if (isTouchDevice) return;
			mouse.x = undefined;
			mouse.y = undefined;
			mouse.clientX = undefined;
			mouse.clientY = undefined;
		};
		
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseleave', handleMouseLeave);
		
		const handleCanvasClick = () => {
			changeProfile();
			currentColorIndex = (currentColorIndex + 1) % colorProfiles.length;
		};

		canvas.addEventListener('click', handleCanvasClick);
		
		const handleKeyDown = (event) => {
			if (event.code === 'Space') {
				event.preventDefault();
				changeProfile();
				currentColorIndex = (currentColorIndex + 1) % colorProfiles.length;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		
		// Initial setup
		resizeCanvas();
		initializeDots();
		
		// Start animation
		animate();
		
		// Handle window resize
		const handleResize = () => {
			resizeCanvas();
		};
		
		window.addEventListener('resize', handleResize);
		
		// Cleanup
		return () => {
			if (animationId) {
				cancelAnimationFrame(animationId);
			}
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseleave', handleMouseLeave);
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('touchstart', handleFirstTouch);
			canvas.removeEventListener('click', handleCanvasClick);
			if (window.visualViewport) {
				window.visualViewport.removeEventListener('resize', handleViewportResize);
			}
		};
	});
</script>

<svelte:head>
    <title>Orange</title>
    <link rel="icon" href="/orange-gradient.png" />
</svelte:head>

<div class="container" style="--theme-color: {currentTheme.color}">
    <div class = 'mast'>
        <p>
            Orange is built on a simple idea: who you are is found in what you do. Not in the boxes you check, but in the choices you make when the stakes are real.
           <br> <br>
            We believe personality isn’t a static label. It’s a living system, an unfolding story.

            <br> <br>
            
            This is not a personality test. It is a series of small worlds, simulations designed to be played. The result is not a score, but a reflection.
            <br> <br>
             A new way to see the judgment, creativity and taste that makes you, you.

        </p>
        <form on:submit|preventDefault={joinWaitlist}>
            <input
				type="email"
				bind:value={email}
				placeholder="your@email.com"
				required
				bind:this={emailInput}
				on:mouseenter={() => { if (!isTouchDevice) isInputHovered = true; }}
				on:mouseleave={() => { if (!isTouchDevice) isInputHovered = false; }}
			/>
            <button
				type="submit"
				on:mouseenter={() => { if (!isTouchDevice) isButtonHovered = true; }}
				on:mouseleave={() => { if (!isTouchDevice) isButtonHovered = false; }}
				disabled={isSubmitting}
			>{isSubmitting ? 'Adding...' : 'Join Waitlist'}</button>
          </form>
    </div>
	<canvas bind:this={canvas}></canvas>
</div>
<canvas bind:this={interactionCanvas} class="interaction-canvas"></canvas>

<style lang="scss">
    
	:global(body) {
		margin: 0;
		padding: 0;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		font-family: 'Lora', serif;
        background: white;
		cursor: none;
    }

	:global(body.touch-device) {
		cursor: auto;
	}

	::selection{
		background: rgb(255, 98, 0);
		color: white;
    }

	.container {
		display: flex;
		justify-content: center;
		align-items: center;
        gap: 48px;
		width: 100vw;
		height: 100dvh;
		position: relative;
        background: white;
        .mast{
            width: 400px;
            p{
                font-family: 'Lora', serif;
                font-size: 14px;
                letter-spacing: -0.25px;
            }
        }
	}

	.interaction-canvas {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw !important;
		height: 100vh !important;
		pointer-events: none;
		z-index: 9999;
	}

    form{
        margin-top: 24px;
        display: flex;
        gap: 18px;
        input{
            outline: none;
            border: none;
            border-bottom: 1.5px solid rgba(0, 0, 0, 0.15);
            line-cap: round;
            padding: 4px 0px;
            font-family: 'Lora', serif;
            font-size: 16px;
            font-weight: 450;
            letter-spacing: -0.25px;
            width: 240px;
            transition: all 0.3s ease;
			cursor: none;

            &::placeholder{
                color: rgba(0, 0, 0, 0.3);
            }

            &:focus{
                border-bottom: 1.5px solid var(--theme-color);
            }
        }
        button{
            background: var(--theme-color);
            color: white;
            border: none;
            padding: 8px 18px 8.5px 18px;
            border-radius: 40px;
            font-family: 'Lora', serif;
            font-size: 15px;
            font-weight: 450;
            letter-spacing: -0.25px;
            box-shadow: -4px 4px 10px 0 color-mix(in srgb, var(--theme-color) 40%, transparent);
            transition: 0.2s ease;
           
            &:hover{
                //background: color-mix(in srgb, var(--theme-color) 90%, black);
                cursor: pointer;
				cursor: none;
				transform: scale(1.05);
            }
			&:disabled{
				opacity: 0.5;
				cursor: not-allowed;
			}
        }
	}

	canvas {
        width: 480px !important;
        height: 480px !important;
		display: block;
		--dot-radius: 3;
	}

    @media (max-width: 768px) {

        .container {
            flex-direction: column-reverse;
            width: 100vw;
            height: 100%;
            padding: 24px;
            gap: 0;
            box-sizing: border-box;
            canvas{
                width: 90vw !important;
                height: 90vw !important;
				--dot-radius: 2;
            }
            .mast{
                width: 100%;
                box-sizing: border-box;
            }
			.interaction-canvas {
				display: none;
			}
        }

        form{
            display: flex;
            flex-direction: column;
            gap: 18px;
            align-items: center;
            width: 100%;
            box-sizing: border-box;
            input{
                width: 98%;
            }
            button{
                width: 100%;
                padding: 14px;
            }
        }
    }


</style>