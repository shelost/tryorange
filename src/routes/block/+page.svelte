<script>
    import { onMount, onDestroy } from 'svelte';
    import { fade, fly, scale } from 'svelte/transition';
    import { enhance } from '$app/forms';
    import StartScreen from '$lib/StartScreen.svelte';
    import ResultsScreen from '$lib/ResultsScreen.svelte';

    // Game configuration
    let selectedDuration = 20; // 20, 40, 60 seconds
    
    // Game state
    let started = false;
    let finished = false;
    let gameTime = 0;
    let score = 0;
    let previousScore = 0;
    let scoreColor = 'rgba(0,0,0, 0.15)';
    let scoreColorTimeout = null;
    let gameLoop = null;
    let startTime = 0;
    
    // Canvas and game objects
    let canvas;
    let ctx;
    let canvasWidth = 0;
    let canvasHeight = 0;
    
    // Paddle (will be initialized after class definition)
    let paddle;
    
    // Pellets
    let pellets = [];
    let pelletSpawnRate = 0.15; // Very high frequency - Probability per frame
    
    // Input handling
    let keys = {};
    let mouseX = 0;
    let mouseY = 0;
    let mouseControlEnabled = true;
    let showMouseIndicator = false;
    
    // Check if device supports hover (desktop)
    let isDesktop = false;
    
    // Action logging for personality analysis
    let actionLog = [];
    let lastLogTime = 0;
    
    // Analysis state
    let analysisForm;
    let analysisLoading = false;
    let analysisResult = null;
    let analysisError = null;
    
    
    const CACHE_KEY = 'block-game-cache';

    // Canvas scaling for high resolution
    const SCALE_FACTOR = 2;
    
    // Responsive sizing variables
    let isMobile = false;
    let screenWidth = 0;
    let responsiveScale = 1;

    // Base pellet types (desktop sizes)
    const BASE_PELLET_TYPES = {
        GREEN: { color: '#22c55e', points: 3, radius: 18, displayText: '+3' },
        RED: { color: '#ef4444', points: -2, radius: 16, displayText: '-2' },
        YELLOW: { color: '#eab308', points: () => Math.floor(Math.random() * 16) - 5, radius: 20, displayText: '?' }
    };

    // Responsive pellet types (will be calculated based on screen size)
    let PELLET_TYPES = { ...BASE_PELLET_TYPES };

    // Paddle class for pill-shaped paddles
    class Paddle {
        constructor(x, y, width, height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.speed = 8;
        }

        draw(ctx, color = '#ff6a00', alpha = 1.0) {
            const radius = this.height / 2;
            
            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            
            // Draw pill shape (rounded rectangle)
            ctx.moveTo(this.x + radius, this.y);
            ctx.lineTo(this.x + this.width - radius, this.y);
            ctx.arc(this.x + this.width - radius, this.y + radius, radius, -Math.PI/2, Math.PI/2);
            ctx.lineTo(this.x + radius, this.y + this.height);
            ctx.arc(this.x + radius, this.y + radius, radius, Math.PI/2, -Math.PI/2);
            ctx.closePath();
            ctx.fill();
            
            ctx.globalAlpha = 1.0; // Reset alpha
        }

        drawShadow(ctx, color = 'rgba(255, 106, 0, 0.4)', alpha = 0.4) {
            this.draw(ctx, color, alpha);
        }
    }

    // Initialize paddle after class definition (will be resized responsively)
    paddle = new Paddle(0, 0, 120, 20);

    // Pellet class for consistent state management
    class Pellet {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.type = type;
            this.typeData = PELLET_TYPES[type];
            this.color = this.typeData.color;
            this.radius = this.typeData.radius;
            this.points = typeof this.typeData.points === 'function' ? this.typeData.points() : this.typeData.points;
            this.speed = 4 + Math.random() * 4; // 4-8 pixels per frame
            this.revealed = false; // Track if yellow pellet has been revealed
        }

        update() {
            this.y += this.speed;
        }

        getDistanceFromPaddle(paddle) {
            // Calculate distance from pellet center to paddle center
            const paddleCenterX = paddle.x + paddle.width / 2;
            const paddleCenterY = paddle.y + paddle.height / 2;
            
            return Math.sqrt(
                (this.x - paddleCenterX) ** 2 + (this.y - paddleCenterY) ** 2
            );
        }

        draw(ctx, paddle) {
            let currentColor = this.color;
            let displayText = this.typeData.displayText;
            
            // Yellow pellet color reveal logic
            if (this.type === 'YELLOW' && paddle) {
                const distanceFromPaddle = this.getDistanceFromPaddle(paddle);
                
                if (distanceFromPaddle <= 120) { // Reveal within 120px
                    this.revealed = true;
                    // Change color based on points value
                    if (this.points > 0) {
                        currentColor = '#22c55e'; // Green for positive
                        displayText = `+${this.points}`;
                    } else {
                        currentColor = '#ef4444'; // Red for negative
                        displayText = this.points.toString();
                    }
                }
            }
            
            // Draw pellet circle
            ctx.fillStyle = currentColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw points text on pellet
            ctx.fillStyle = 'white';
            ctx.font = `${this.typeData.radius-2}px Inter`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(displayText, this.x, this.y);
        }

        isOffScreen(canvasHeight) {
            return this.y > canvasHeight + this.radius;
        }

        collidesWith(paddle) {
            // Rectangle-circle collision detection
            const closestX = Math.max(paddle.x, Math.min(this.x, paddle.x + paddle.width));
            const closestY = Math.max(paddle.y, Math.min(this.y, paddle.y + paddle.height));
            
            const distance = Math.sqrt(
                (this.x - closestX) ** 2 + (this.y - closestY) ** 2
            );
            
            return distance < this.radius;
        }
    }

    function updateResponsiveSettings() {
        screenWidth = window.innerWidth;
        isMobile = screenWidth < 768;
        
        // Calculate responsive scale (mobile gets smaller elements)
        if (isMobile) {
            responsiveScale = Math.max(0.6, screenWidth / 1200); // 60% minimum, scales up to desktop
        } else {
            responsiveScale = 1; // Full size for desktop
        }
        
        // Update pellet types with responsive sizing
        PELLET_TYPES = {
            GREEN: { 
                ...BASE_PELLET_TYPES.GREEN, 
                radius: Math.round(BASE_PELLET_TYPES.GREEN.radius * responsiveScale) 
            },
            RED: { 
                ...BASE_PELLET_TYPES.RED, 
                radius: Math.round(BASE_PELLET_TYPES.RED.radius * responsiveScale) 
            },
            YELLOW: { 
                ...BASE_PELLET_TYPES.YELLOW, 
                radius: Math.round(BASE_PELLET_TYPES.YELLOW.radius * responsiveScale) 
            }
        };
        
        // Update paddle size
        const basePaddleWidth = 120;
        const basePaddleHeight = 20;
        paddle.width = Math.round(basePaddleWidth * responsiveScale);
        paddle.height = Math.round(basePaddleHeight * responsiveScale);
        
        // Adjust pellet spawn rate for mobile (fewer pellets on smaller screens)
        if (isMobile) {
            pelletSpawnRate = 0.10; // Slightly reduced for mobile
        } else {
            pelletSpawnRate = 0.15; // Full rate for desktop
        }
    }

    function initCanvas() {
        if (!canvas) return;
        
        // Update responsive settings first
        updateResponsiveSettings();
        
        // Clear any existing canvas content
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // Set canvas dimensions first
        resizeCanvas();
        
        // Get fresh context after dimensions are set
        ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Failed to get 2D context');
            return;
        }
        
        // Reset all context properties to defaults
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform matrix
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.setLineDash([]);
        
        // Scale context for high resolution
        ctx.scale(SCALE_FACTOR, SCALE_FACTOR);
        
        // Initialize paddle position
        paddle.x = canvasWidth / 2 - paddle.width / 2;
        paddle.y = canvasHeight - paddle.height - 20;
        
        // Initial render to show something immediately
        render();
    }

    function resizeCanvas() {
        if (!canvas) return;
        
        // Update responsive settings when canvas resizes
        updateResponsiveSettings();
        
        // Logical dimensions
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;
        
        // Physical dimensions (doubled for high resolution)
        canvas.width = canvasWidth * SCALE_FACTOR;
        canvas.height = canvasHeight * SCALE_FACTOR;
        
        // CSS dimensions (keeps the visual size the same)
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = canvasHeight + 'px';
        
        // Update paddle position if canvas resized during game
        if (started && paddle.x > 0) {
            paddle.x = Math.min(paddle.x, canvasWidth - paddle.width);
            paddle.y = canvasHeight - paddle.height - 20;
        }
        
        // Re-apply scaling if context exists (scaling gets reset when canvas dimensions change)
        if (ctx) {
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
            ctx.scale(SCALE_FACTOR, SCALE_FACTOR);
        }
    }

    function startGame() {
        console.log('Starting game...');
        localStorage.removeItem(CACHE_KEY);
        
        // Clear any existing game loop
        if (gameLoop) {
            clearInterval(gameLoop);
            gameLoop = null;
        }
        
        // Reset game state completely
        started = true;
        finished = false;
        gameTime = 0;
        score = 0;
        previousScore = 0;
        scoreColor = 'rgba(0,0,0, 0.15)';
        if (scoreColorTimeout) {
            clearTimeout(scoreColorTimeout);
            scoreColorTimeout = null;
        }
        pellets = [];
        actionLog = [];
        startTime = Date.now();
        lastLogTime = 0;
        
        // Reset input state
        keys = {};
        mouseControlEnabled = true;
        showMouseIndicator = false;
        
        // Reset analysis state
        analysisResult = null;
        analysisError = null;
        
        // Wait for canvas to be rendered, then initialize
        setTimeout(() => {
            console.log('Canvas element after timeout:', canvas);
            if (canvas) {
                // Force canvas re-initialization
                ctx = null; // Clear existing context
                initCanvas();
                console.log('Canvas dimensions:', canvasWidth, 'x', canvasHeight);
                console.log('Context:', ctx);
                console.log('Paddle position:', paddle.x, paddle.y);
                
                // Log game start
                logAction('game_start', { duration: selectedDuration });
                
                // Start game loop
                gameLoop = setInterval(updateGame, 1000 / 60); // 60 FPS
                console.log('Game loop started');
            } else {
                console.error('Canvas still not available after timeout');
                // Fallback: try again with longer delay
                setTimeout(() => {
                    if (canvas) {
                        ctx = null;
                        initCanvas();
                        logAction('game_start', { duration: selectedDuration });
                        gameLoop = setInterval(updateGame, 1000 / 60);
                    }
                }, 100);
            }
        }, 0);
    }

    function updateGame() {
        const currentTime = Date.now();
        gameTime = (currentTime - startTime) / 1000;
        
        // Check if game should end
        if (gameTime >= selectedDuration) {
            endGame();
            return;
        }
        
        // Update paddle
        updatePaddle();
        
        // Spawn pellets
        spawnPellets();
        
        // Update pellets
        updatePellets();
        
        // Check collisions
        checkCollisions();
        
        // Render
        render();
        
        // Log periodic position data
        if (currentTime - lastLogTime > 100) { // Every 100ms
            logAction('paddle_position', { 
                x: paddle.x, 
                time: gameTime,
                pelletCount: pellets.length
            });
            lastLogTime = currentTime;
        }
    }

    function updatePaddle() {
        if (!isMobile && mouseControlEnabled) {
            // Mouse control for desktop
            paddle.x = mouseX - paddle.width / 2;
        } else if (!isMobile || !mouseControlEnabled) {
            // Keyboard control (desktop and mobile fallback)
            if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
                paddle.x -= paddle.speed;
            }
            if (keys['ArrowRight'] || keys['d'] || keys['D']) {
                paddle.x += paddle.speed;
            }
        }
        // Mobile touch control is handled in handleCanvasClick/handleCanvasTouch
        
        // Keep paddle within bounds
        paddle.x = Math.max(0, Math.min(canvasWidth - paddle.width, paddle.x));
    }

    function spawnPellets() {
        if (Math.random() < pelletSpawnRate) {
            const types = Object.keys(PELLET_TYPES);
            const randomType = types[Math.floor(Math.random() * types.length)];
            const pelletType = PELLET_TYPES[randomType];
            
            const pellet = new Pellet(
                Math.random() * (canvasWidth - pelletType.radius * 2) + pelletType.radius,
                -pelletType.radius,
                randomType
            );
            
            pellets.push(pellet);
            
            logAction('pellet_spawn', {
                type: randomType,
                x: pellet.x,
                points: pellet.points,
                time: gameTime
            });
        }
    }

    function updatePellets() {
        pellets = pellets.filter(pellet => {
            pellet.update();
            
            // Remove pellets that have fallen off screen
            if (pellet.isOffScreen(canvasHeight)) {
                logAction('pellet_missed', {
                    type: pellet.type,
                    points: pellet.points,
                    time: gameTime
                });
                return false;
            }
            
            return true;
        });
    }

    function updateScore(points) {
        previousScore = score;
        score += points;
        
        // Clear any existing timeout
        if (scoreColorTimeout) {
            clearTimeout(scoreColorTimeout);
        }
        
        // Set color based on score change
        if (points > 0) {
            scoreColor = 'rgba(34, 197, 94, 0.4)'; // Green for positive
        } else if (points < 0) {
            scoreColor = 'rgba(239, 68, 68, 0.4)'; // Red for negative
        }
        
        // Revert to default color after delay
        scoreColorTimeout = setTimeout(() => {
            scoreColor = 'rgba(0,0,0, 0.15)';
        }, 600);
    }

    function checkCollisions() {
        pellets = pellets.filter(pellet => {
            if (pellet.collidesWith(paddle)) {
                // Collision detected
                updateScore(pellet.points);
                
                logAction('pellet_caught', {
                    type: pellet.type,
                    points: pellet.points,
                    scoreAfter: score,
                    paddleX: paddle.x,
                    time: gameTime
                });
                
                return false; // Remove pellet
            }
            
            return true; // Keep pellet
        });
    }

    function render() {
        if (!ctx || !canvas) {
            console.warn('Canvas or context not available for rendering');
            return;
        }
        
        // Clear canvas with background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw large center score behind everything
        drawCenterScore();
        
        // Draw mouse indicator (shadow paddle and connection line) if on desktop
        if (showMouseIndicator && isDesktop && mouseControlEnabled) {
            drawMouseIndicator();
        }
        
        // Draw paddle
        paddle.draw(ctx);
        
        // Draw pellets using their class method
        pellets.forEach(pellet => {
            pellet.draw(ctx, paddle);
        });
        
        // Draw UI (timer and instructions)
        drawUI();
    }

    function drawMouseIndicator() {
        // Calculate shadow paddle position
        const shadowPaddleX = mouseX - paddle.width / 2;
        const shadowPaddleY = mouseY - paddle.height / 2;
        
        // Keep shadow paddle within bounds
        const clampedShadowX = Math.max(0, Math.min(canvasWidth - paddle.width, shadowPaddleX));
        
        // Draw translucent connection line from actual paddle to shadow paddle
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.lineWidth = 5;
        ctx.setLineDash([10, 10]); // Dashed line
        ctx.beginPath();
        ctx.moveTo(paddle.x + paddle.width / 2, paddle.y + paddle.height / 2);
        ctx.lineTo(clampedShadowX + paddle.width / 2, shadowPaddleY + paddle.height + 10);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
        
        // Create shadow paddle instance and draw it
        const shadowPaddle = new Paddle(clampedShadowX, shadowPaddleY, paddle.width, paddle.height);
        shadowPaddle.drawShadow(ctx, 'rgba(0, 0, 0, 1)', 0.1);
    }

    function drawCenterScore() {
        // Large translucent score in center
        ctx.fillStyle = scoreColor;
        ctx.font = 'bold 160px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // Add subtle shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        
        ctx.fillText(score.toString(), canvasWidth / 2, 40);
        
        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
    }

    function drawUI() {
        // Time remaining (top right)
        const timeLeft = Math.max(0, selectedDuration - gameTime);
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 24px Inter';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`Time: ${Math.ceil(timeLeft)}s`, canvasWidth - 20, 20);
        
        // Instructions (first few seconds)
        if (gameTime < 3) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.font = `${Math.round(18 * responsiveScale)}px Inter`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let instructionText;
            if (isMobile) {
                instructionText = 'Tap left/right sides of screen to move paddle!';
            } else if (isDesktop) {
                instructionText = 'Follow the shadow paddle with your mouse • Catch pellets for points!';
            } else {
                instructionText = 'Move mouse to control paddle • Catch pellets for points!';
            }
            
            ctx.fillText(instructionText, canvasWidth / 2, canvasHeight / 2 + (100 * responsiveScale));
        }
    }

    function endGame() {
        // Clear game loop
        if (gameLoop) {
            clearInterval(gameLoop);
            gameLoop = null;
        }
        
        // Update game state
        started = false;
        finished = true;
        analysisLoading = true;
        
        // Reset input indicators
        showMouseIndicator = false;
        
        // Log final game data
        logAction('game_end', {
            finalScore: score,
            duration: gameTime,
            totalActions: actionLog.length
        });
        
        // Submit for analysis
        if (analysisForm) {
            analysisForm.requestSubmit();
        }
    }

    function logAction(action, data) {
        actionLog.push({
            action,
            timestamp: Date.now() - startTime,
            gameTime: gameTime,
            ...data
        });
    }

    function handleKeyDown(e) {
        keys[e.key] = true;
        
        if (started) {
            if (e.key === 'Escape') {
                exitGame();
            }
            // Disable mouse control when using keyboard
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D') {
                mouseControlEnabled = false;
            }
        }
    }

    function handleKeyUp(e) {
        keys[e.key] = false;
    }

    function handleMouseMove(e) {
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
            
            if (started && !isMobile) {
                mouseControlEnabled = true;
                showMouseIndicator = true;
            }
        }
    }

    function handleMouseEnter() {
        if (started && isDesktop) {
            showMouseIndicator = true;
        }
    }

    function handleMouseLeave() {
        showMouseIndicator = false;
    }

    function handleCanvasClick(e) {
        if (!started || !isMobile) return;
        
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const canvasCenterX = canvasWidth / 2;
        
        // Move paddle based on which half of the screen was tapped
        const targetX = clickX < canvasCenterX ? 
            paddle.width / 2 : // Left side - move to left edge
            canvasWidth - paddle.width / 2; // Right side - move to right edge
            
        // Smooth movement toward target
        const moveSpeed = paddle.speed * 2; // Faster movement for touch
        const currentCenterX = paddle.x + paddle.width / 2;
        
        if (Math.abs(targetX - currentCenterX) > moveSpeed) {
            if (targetX > currentCenterX) {
                paddle.x += moveSpeed;
            } else {
                paddle.x -= moveSpeed;
            }
        } else {
            paddle.x = targetX - paddle.width / 2;
        }
        
        // Keep paddle within bounds
        paddle.x = Math.max(0, Math.min(canvasWidth - paddle.width, paddle.x));
        
        logAction('mobile_tap', {
            clickX,
            paddleX: paddle.x,
            side: clickX < canvasCenterX ? 'left' : 'right',
            time: gameTime
        });
    }

    function handleCanvasTouch(e) {
        e.preventDefault(); // Prevent scrolling
        if (!started || !isMobile) return;
        
        const touch = e.touches[0] || e.changedTouches[0];
        if (!touch) return;
        
        const rect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const canvasCenterX = canvasWidth / 2;
        
        // Determine target position based on touch side
        if (touchX < canvasCenterX) {
            // Left side - move paddle left
            paddle.x = Math.max(0, paddle.x - paddle.speed * 3);
        } else {
            // Right side - move paddle right
            paddle.x = Math.min(canvasWidth - paddle.width, paddle.x + paddle.speed * 3);
        }
        
        logAction('mobile_touch', {
            touchX,
            paddleX: paddle.x,
            side: touchX < canvasCenterX ? 'left' : 'right',
            time: gameTime
        });
    }

    function exitGame() {
        // Clear game loop
        if (gameLoop) {
            clearInterval(gameLoop);
            gameLoop = null;
        }
        
        // Reset all game state
        started = false;
        finished = false;
        pellets = [];
        actionLog = [];
        gameTime = 0;
        score = 0;
        previousScore = 0;
        scoreColor = 'rgba(0,0,0, 0.15)';
        if (scoreColorTimeout) {
            clearTimeout(scoreColorTimeout);
            scoreColorTimeout = null;
        }
        
        // Reset input state
        keys = {};
        mouseControlEnabled = true;
        showMouseIndicator = false;
        
        // Clear canvas
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        }
    }

    onMount(() => {
        const cachedResults = localStorage.getItem(CACHE_KEY);
        if (cachedResults) {
            try {
                const data = JSON.parse(cachedResults);
                analysisResult = data.analysisResult;
                finished = true;
                started = false;
            } catch (e) {
                console.error('Failed to parse cached results', e);
                localStorage.removeItem(CACHE_KEY);
            }
        }

        // Detect if device supports hover (desktop)
        isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        // Canvas will be initialized when game starts
        console.log('Component mounted, canvas initialization will happen on game start');

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('resize', resizeCanvas);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('resize', resizeCanvas);
            if (gameLoop) {
                clearInterval(gameLoop);
            }
        };
    });

    onDestroy(() => {
        if (gameLoop) {
            clearInterval(gameLoop);
        }
    });

    // Export results as JSON string for analysis
    $: resultsJson = JSON.stringify({
        duration: selectedDuration,
        finalScore: score,
        actions: actionLog
    }, null, 2);

    const radarLabels = [
        'Risk-Taking', 'Optimism', 'Anxiety', 'Strategic Thinking', 'Impulsivity'
    ];

    // Reactive statement to handle canvas binding
    $: if (canvas && started && !ctx) {
        console.log('Reactive canvas initialization triggered');
        initCanvas();
    }
</script>

<svelte:head>
    <title>Block Catcher</title>
</svelte:head>

<svelte:window on:mousemove={handleMouseMove} on:mouseenter={handleMouseEnter} on:mouseleave={handleMouseLeave} />

<div class="app">
    <!-- Invisible form for submitting analysis request -->
    <form
        bind:this={analysisForm}
        action="?/analyze"
        method="POST"
        use:enhance={() => {
            analysisLoading = true;
            analysisResult = null;
            analysisError = null;

            return async ({ result }) => {
                if (result.type === 'success' && result.data?.analysis) {
                    analysisResult = result.data.analysis;
                    const cacheData = { analysisResult };
                    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                } else if (result.type === 'failure' && result.data?.error) {
                    analysisError = result.data.error;
                } else if (result.type === 'error') {
                    analysisError = result.error.message;
                }
                analysisLoading = false;
            };
        }}
        style="display: none;"
    >
        <input type="hidden" name="gameData" value={resultsJson} />
    </form>

    <div class="game-container">
        {#if !started && !finished}
            <div in:fade={{ duration: 300, delay: 200 }} out:fade={{ duration: 200 }}>
                <StartScreen
                    title="Block Catcher"
                    subtitle="Catch falling pellets with your paddle"
                    gameType="block"
                    bind:selectedDuration
                    onStart={startGame}
                />
            </div>
        {/if}

        {#if started}
            <div class="canvas-container" in:fade={{ duration: 300, delay: 200 }} out:fade={{ duration: 200 }}>
                <canvas
                    bind:this={canvas}
                    class="game-canvas"
                    on:click={handleCanvasClick}
                    on:touchstart={handleCanvasTouch}
                    on:touchmove={handleCanvasTouch}
                ></canvas>
                <button class="exit-button" type="button" on:click={exitGame} aria-label="Exit game" in:scale={{ duration: 140 }}>
                    Exit
                </button>
            </div>
        {/if}

        {#if finished}
            <div class = 'results-container' in:fade={{ duration: 300, delay: 200 }} out:fade={{ duration: 200 }}>
                <ResultsScreen
                    title="Game Complete!"
                    gameType="block"
                    finalScore={score}
                    {analysisLoading}
                    {analysisResult}
                    {analysisError}
                    labels={radarLabels}
                    onComplete={() => {
                        finished = false;
                        analysisResult = null;
                        analysisError = null;
                        localStorage.removeItem(CACHE_KEY);
                    }}
                    onRestart={startGame}
                />
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    
    .app {
        font-family: 'Inter', sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        padding: 0;
        overflow: hidden;
        overflow-y: scroll;
    }

    .game-container {
        position: relative;
        width: 100%;
        height: fit-content;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

    
        div {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;

            @media screen and (max-width: 768px) {
                align-items: flex-start;
                justify-content: flex-start;
            }
        }
    }

    .canvas-container {
        width: 100%;
        height: 100%;
        position: relative;
    }

    .game-canvas {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        cursor: none;
        background: #f8fafc;
        display: block;
        z-index: 10;
    }


    button {
        font-family: 'Inter', sans-serif;
        background: #ff6a00;
        color: white;
        border: 0;
        border-radius: 48px;
        padding: 9.5px 24px 10px 24px;
        font-weight: 550;
        font-size: 15px;
        letter-spacing: -0.2px;
        transition: 0.2s ease;
        cursor: pointer;
        &:hover {
            opacity: 0.8;
        }
    }


    .exit-button {
        position: fixed;
        left: 50%;
        bottom: 20px;
        transform: translateX(-50%);
        padding: 10px 16px;
        border-radius: 999px;
        border: 0;
        background: #ef4444;
        color: white;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
    }
</style>
