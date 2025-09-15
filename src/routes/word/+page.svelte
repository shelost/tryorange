<script>
    import { onMount, onDestroy } from 'svelte';
    import { getInterleavedWords } from '$lib/word_bank.js';
    import { fade, fly, scale } from 'svelte/transition';
    import { enhance } from '$app/forms';

    // Configurable options
    let selectedLength = 10; // 10, 20, 30
    let timePerWordMs = 6000; // default 6 seconds per word

    // Game state
    let started = false;
    let finished = false;
    let words = [];
    let index = 0;
    let inputValue = '';
    let responses = [];
    let elapsedMs = 0; // elapsed time within current slide
    let intervalId = null;
    let startedAt = 0;

    // Accessible refs
    let inputRef;

    // Analysis state
    let analysisForm;
    let analysisLoading = false;
    let analysisResult = null;
    let analysisError = null;
    let analysisScores = null;

    // Canvas ref
    let radarCanvas;

    function startGame() {
        words = getInterleavedWords(selectedLength);
        responses = [];
        index = 0;
        inputValue = '';
        elapsedMs = 0;
        started = true;
        finished = false;
        startedAt = Date.now();
        startTimer();
        tickFocus();
        analysisResult = null;
        analysisError = null;
        analysisScores = null;
    }

    function startTimer() {
        clearTimer();
        startedAt = Date.now();
        intervalId = setInterval(() => {
            const now = Date.now();
            elapsedMs = now - startedAt;
            if (elapsedMs >= timePerWordMs) {
                commitAndNext();
            }
        }, 30);
    }

    function clearTimer() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    function commitCurrent() {
        const currentWord = words[index];
        const trimmed = (inputValue || '').trim();
        responses = [
            ...responses,
            {
                stimulus: currentWord,
                response: trimmed,
                timeMs: Math.min(elapsedMs, timePerWordMs)
            }
        ];
    }

    function commitAndNext() {
        commitCurrent();
        if (index + 1 >= words.length) {
            finishGame();
        } else {
            index += 1;
            inputValue = '';
            elapsedMs = 0;
            startedAt = Date.now();
            startTimer();
            tickFocus();
        }
    }

    function finishGame() {
        clearTimer();
        started = false;
        finished = true;
        analysisLoading = true;
        analysisResult = null;
        analysisError = null;

        if (analysisForm) {
            analysisForm.requestSubmit();
        }
    }

    function handleKeydown(e) {
        if (!started) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            commitAndNext();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            exitGame();
        }
    }

    function exitGame() {
        clearTimer();
        started = false;
        finished = false;
        inputValue = '';
        elapsedMs = 0;
        index = 0;
        // keep selections as-is so the user returns to the config with prior choices
    }

    function handleGlobalKeydown(event) {
        if (event.key === 'Escape' && started) {
            event.preventDefault();
            exitGame();
        }
    }

    function tickFocus() {
        // focus input without scrolling page
        setTimeout(() => {
            if (inputRef && typeof inputRef.focus === 'function') {
                inputRef.focus({ preventScroll: true });
            }
        }, 0);
    }

    onMount(() => {
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', handleGlobalKeydown);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('keydown', handleGlobalKeydown);
            }
            clearTimer();
        };
    });

    onDestroy(() => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', handleGlobalKeydown);
        }
    });

    $: progress = Math.min(100, Math.max(0, (elapsedMs / timePerWordMs) * 100));

    // Export results as JSON string for display
    $: resultsJson = JSON.stringify(
        {
            length: selectedLength,
            timePerWordMs,
            results: responses
        },
        null,
        2
    );

    const radarLabels = [
        'Creativity', 'Optimism', 'Anxiety', 'Pragmatism', 'Spontaneity'
    ];

    function drawRadarChart(canvas, scores) {
        if (!canvas || !scores || scores.length !== 5) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = Math.min(canvas.width, canvas.height);
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size * 0.35;
        const sides = 5;
        const angle = (Math.PI * 2) / sides;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw pentagon grid
        ctx.strokeStyle = '#e5e7eb';
        for (let i = 1; i <= 5; i++) {
            const r = radius * (i / 5);
            ctx.beginPath();
            for (let j = 0; j < sides; j++) {
                const x = centerX + r * Math.cos(angle * j - Math.PI / 2);
                const y = centerY + r * Math.sin(angle * j - Math.PI / 2);
                if (j === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Draw labels
        ctx.fillStyle = '#4b5563';
        for (let i = 0; i < sides; i++) {
            const r = radius * 1.15;
            const x = centerX + r * Math.cos(angle * i - Math.PI / 2);
            const y = centerY + r * Math.sin(angle * i - Math.PI / 2);
            ctx.fillText(radarLabels[i], x, y);
        }

        // Draw data shape
        ctx.fillStyle = 'rgba(52, 211, 153, 0.4)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const score = scores[i] ?? 0;
            const r = radius * (score / 10);
            const x = centerX + r * Math.cos(angle * i - Math.PI / 2);
            const y = centerY + r * Math.sin(angle * i - Math.PI / 2);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    $: if (radarCanvas && analysisScores) {
        drawRadarChart(radarCanvas, analysisScores);
    }
</script>

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
                analysisScores = result.data.scores;
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
    <input type="hidden" name="responses" value={resultsJson} />
</form>

{#if !started && !finished}
    <section class="config" in:fade={{ duration: 200 }} out:fade={{ duration: 150 }}>
        <h1 class="title">Word Association</h1>
        <div class="controls">
            <label class="control">
                <span>Number of words</span>
                <div class="options">
                    <button class:selected={selectedLength === 10} on:click={() => (selectedLength = 10)}>10</button>
                    <button class:selected={selectedLength === 20} on:click={() => (selectedLength = 20)}>20</button>
                    <button class:selected={selectedLength === 30} on:click={() => (selectedLength = 30)}>30</button>
                </div>
            </label>
            <label class="control">
                <span>Time per word</span>
                <div class="options">
                    <button class:selected={timePerWordMs === 4000} on:click={() => (timePerWordMs = 4000)}>4s</button>
                    <button class:selected={timePerWordMs === 6000} on:click={() => (timePerWordMs = 6000)}>6s</button>
                    <button class:selected={timePerWordMs === 8000} on:click={() => (timePerWordMs = 8000)}>8s</button>
                </div>
            </label>
        </div>
        <button class="start" on:click={startGame}>Start</button>
        <p class="hint">Type the first word that comes to mind. Press Enter to submit. The slide advances automatically when time runs out.</p>
    </section>
{/if}

{#if started}
    <section class="slide" role="application" in:fade={{ duration: 150 }} out:fade={{ duration: 120 }}>
        <div class="progress-track" aria-hidden="true">
            <div class="progress-bar" style={`width: ${progress}%`}></div>
        </div>
        <div class="word" aria-live="polite" in:fly={{ y: 12, duration: 180 }} out:fly={{ y: -8, duration: 120 }}>{words[index]}</div>
        <input
            bind:this={inputRef}
            class="response"
            type="text"
            placeholder="..."
            bind:value={inputValue}
            on:keydown={handleKeydown}
            autocomplete="off"
            autocapitalize="none"
            spellcheck={false}
            in:fly={{ y: 8, duration: 160 }}
            out:fly={{ y: -8, duration: 120 }}
        />
        <div class="footer" in:fade={{ duration: 150 }}>
            <div class="count">{index + 1} / {words.length}</div>
            <button class="next" on:click={commitAndNext}>Next</button>
        </div>
        <button class="exit-button" type="button" on:click={exitGame} aria-label="Exit to selection" in:scale={{ duration: 140 }}>Exit</button>
    </section>
{/if}

{#if finished}
    <section class="results" in:fade={{ duration: 150 }} out:fade={{ duration: 120 }}>
        <h2 class="title">Your Associations</h2>

        {#if analysisLoading}
            <div class="loading" in:fade>Generating your analysis...</div>
        {/if}

        <div class="analysis-container">
            {#if analysisScores}
                <div class="chart-container" in:fade>
                    <canvas bind:this={radarCanvas} width="300" height="300"></canvas>
                </div>
            {/if}
            {#if analysisResult}
                <div class="analysis-result" in:fade>
                    <h3>Personality Analysis</h3>
                    <p>{analysisResult}</p>
                </div>
            {/if}
        </div>

        {#if analysisError}
            <div class="analysis-error" in:fade>
                <p>Sorry, there was an error generating your analysis: {analysisError}</p>
            </div>
        {/if}

        <pre class="json">{resultsJson}</pre>
        <div class="actions">
            <button on:click={() => {
                finished = false;
                analysisResult = null;
                analysisError = null;
                analysisScores = null;
            }}>Back</button>
            <button class="restart" on:click={startGame}>Try again</button>
        </div>
    </section>
{/if}

<style lang="scss">
    .title { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; letter-spacing: -0.25px; }

    .config {
        max-width: 720px; margin: 48px auto; padding: 0 16px; display: flex; flex-direction: column; gap: 24px; align-items: center;

        .controls {
            display: grid; grid-template-columns: 1fr; gap: 16px; width: 100%;

            .control {
                display: grid; gap: 8px; justify-items: center;

                > span { color: #374151; font-weight: 600; }

                .options {
                    display: inline-flex; gap: 8px; background: #e5e7eb; padding: 6px; border-radius: 999px;

                    > button {
                        border: 0; background: transparent; padding: 8px 14px; border-radius: 999px; cursor: pointer; color: #4b5563; font-weight: 600;
                        &.selected { background: white; color: #111827; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
                    }
                }
            }
        }

        .start { padding: 12px 20px; border-radius: 10px; border: 0; background: #111827; color: white; font-weight: 700; cursor: pointer; }
        .hint { color: #6b7280; font-size: 14px; text-align: center; }
    }

    .slide {
        max-width: 900px; margin: 24px auto; padding: 0 16px; display: grid; gap: 20px;

        .progress-track { height: 6px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
        .progress-bar { height: 100%; background: linear-gradient(90deg, #34d399, #f59e0b); transition: width 0.06s linear; }

        .word { font-size: clamp(36px, 8vw, 72px); font-weight: 800; text-align: center; line-height: 1.05; margin-top: 12px; }
        .response {
            font-size: clamp(36px, 8vw, 72px); padding: 14px 16px; border-radius: 12px; border: 2px solid #e5e7eb; outline: none; width: 100%; text-align: center;
            &:focus { border-color: #111827; box-shadow: 0 0 0 3px rgba(17,24,39,0.12); }
        }

        .footer {
            display: flex; justify-content: space-between; align-items: center; margin-top: 8px;
            .count { color: #6b7280; font-weight: 600; }
            .next { padding: 10px 16px; border-radius: 10px; border: 0; background: #111827; color: white; font-weight: 700; cursor: pointer; }
        }
    }

    .results {
        max-width: 900px; margin: 32px auto; padding: 0 16px; display: grid; gap: 16px;
        .json { background: #0b1020; color: #d1f3ff; padding: 16px; border-radius: 12px; overflow: auto; max-height: 60vh; }
        .actions { display: flex; gap: 12px; }
        .restart { background: #111827; color: white; border: 0; border-radius: 8px; padding: 10px 14px; font-weight: 700; cursor: pointer; }

        .analysis-container {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 2rem;
            align-items: center;

            @media (max-width: 768px) {
                grid-template-columns: 1fr;
            }
        }

        .chart-container {
            display: flex;
            justify-content: center;
            align-items: center;
            canvas {
                max-width: 100%;
                height: auto;
            }
        }

        .loading {
            text-align: center;
            padding: 2rem;
            font-weight: 600;
            color: #374151;
        }
        .analysis-result {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            white-space: pre-wrap;
            h3 {
                margin-top: 0;
            }
        }
        .analysis-error {
            background: #fee2e2;
            border: 1px solid #fca5a5;
            color: #b91c1c;
            padding: 1rem 1.5rem;
            border-radius: 12px;
        }
    }

    .exit-button {
        position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%);
        padding: 10px 16px; border-radius: 999px; border: 0; background: #ef4444; color: white; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
</style>

