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
    let elapsedMs = 0;
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

    const CACHE_KEY = 'word-association-cache';

    function startGame() {
        localStorage.removeItem(CACHE_KEY);
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
        const cachedResults = localStorage.getItem(CACHE_KEY);
        if (cachedResults) {
            try {
                const data = JSON.parse(cachedResults);
                analysisResult = data.analysisResult;
                resultsJson = data.resultsJson;
                finished = true;
                started = false;
            } catch (e) {
                console.error('Failed to parse cached results', e);
                localStorage.removeItem(CACHE_KEY);
            }
        }

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
        ctx.font = '18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw pentagon grid
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
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
        ctx.fillStyle = 'rgba(255, 107, 71, 0.25)';
        ctx.strokeStyle = '#ff6a00';
        ctx.lineWidth = 4;
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

        // Draw score points and values
        ctx.fillStyle = '#ff6a00';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.font = 'bold 24px Inter, sans-serif';
        for (let i = 0; i < sides; i++) {
            const score = scores[i] ?? 0;
            const r = radius * (score / 10);
            const x = centerX + r * Math.cos(angle * i - Math.PI / 2);
            const y = centerY + r * Math.sin(angle * i - Math.PI / 2);
            
            // Draw point
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Draw score text next to point
            const textOffset = 25;
            const textX = x + textOffset * Math.cos(angle * i - Math.PI / 2);
            const textY = y + textOffset * Math.sin(angle * i - Math.PI / 2);
            
            ctx.fillStyle = 'black';
            ctx.fillText(score.toString(), textX, textY);
            ctx.fillStyle = '#ff6a00';
        }
    }

    $: if (radarCanvas && analysisResult?.scores) {
        drawRadarChart(radarCanvas, analysisResult.scores);
    }

    // Simple markdown parser for bold and italic text
    function parseMarkdown(text) {
        if (!text) return '';
        // Replace **text** with <strong>text</strong> (bold)
        // Replace *text* with <em>text</em> (italics)
        // Process bold first to avoid conflicts with italic processing
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+?)\*/g, '<em>$1</em>');
    }
</script>

<svelte:head>
    <title>Word Association</title>
</svelte:head>

<div class = 'app'>
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
                const cacheData = { analysisResult, resultsJson };
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
    <input type="hidden" name="responses" value={resultsJson} />
</form>

{#if !started && !finished}
    <section class="config" in:fade={{ duration: 200 }} out:fade={{ duration: 150 }}>
        <div class = 'mast'>
            <h1 class="title">Word Association</h1>
            <p class="hint">Type the first word that comes to mind</p>    
        </div>
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
        <h2 class="title"> Here are your results! </h2>

        {#if analysisLoading}
            <div class="loading" in:fade>Generating your analysis...</div>
        {/if}

        <div class="analysis-container">
            {#if analysisResult?.scores}
                <div class="chart-container" in:fade>
                    <canvas bind:this={radarCanvas} width="600" height="600" style="width: 400px; height: 400px;"></canvas>
                </div>
            {/if}
            {#if analysisResult?.summary}
                <div class="analysis-result" in:fade>
                    <p>{@html parseMarkdown(analysisResult.summary)}</p>
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
            <button class="complete" on:click={() => {
                finished = false;
                analysisResult = null;
                analysisError = null;
                localStorage.removeItem(CACHE_KEY);
            }}> Complete </button>
            <button class="restart" on:click={startGame}> Retry </button>
        </div>
    </section>
{/if}
</div>

<style lang="scss">

    .app{
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 90dvh;
    }

    .mast{
        text-align: center;
        margin-bottom: 24px;

        .title {
            font-family: 'Inter', sans-serif;
            font-size: 32px;
            font-weight: 700;
            margin: 0;
            letter-spacing: -0.25px;
            margin-bottom: 12px;
        }

        .hint { 
            color: rgba(black, 0.4); 
            font-size: 16px; 
            font-weight: 500;
            letter-spacing: -0.25px;
            text-align: center; 
            margin: 0;
        }
    }

    .config {
        max-width: 720px; margin: 48px auto; padding: 0 16px; display: flex; flex-direction: column; gap: 24px; align-items: center;

        .controls {
            display: grid; grid-template-columns: 1fr; gap: 16px; width: 100%;

            .control {
                display: grid; gap: 8px; justify-items: center;

                span { 
                    color: rgba(black, 0.4); 
                    font-weight: 550; 
                    font-size: 14px;
                    letter-spacing: -0.25px;
                }

                .options {
                    display: inline-flex; gap: 8px; background: #e5e7eb; padding: 6px; border-radius: 999px;

                    > button {
                        border: 0; background: transparent; padding: 8px 14px; border-radius: 999px; cursor: pointer; color: #4b5563; font-weight: 600;
                        &.selected { background: white; color: #111827; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
                    }
                }
            }
        }
        .start{
            margin-top: 36px;
            font-size: 18px;
            width: 200px;
        }

   
    }

    .slide {
        max-width: 900px;
        margin: 24px auto;
        padding: 0 16px;
        display: grid;
        gap: 48px;

        .progress-track {   
            height: 6px; 
            background: #e5e7eb; 
            border-radius: 999px; 
            overflow: hidden;
        }
        .progress-bar { 
            height: 100%; 
            background: linear-gradient(90deg, #ff6a00, #f59e0b); 
            transition: width 0.06s linear; 
        }
        .word { 
            font-size: clamp(36px, 8vw, 72px); 
            font-weight: 800; 
            text-align: center; 
            line-height: 1.05; 
            letter-spacing: -1.5px;
            margin-top: 12px; 
        }
        .response {

            font-weight: 800; 
            font-family: 'Inter', sans-serif;
            
            background: rgba(black, 0.05);
            letter-spacing: -1.5px;

            font-size: clamp(36px, 8vw, 72px); 
            padding: 14px 16px; 
            border-radius: 12px; 
            border: none;
            outline: none; 
            width: 100%; 
            box-sizing: border-box;
            text-align: center;
            transition: 0.2s ease;
            &:focus { 
                background: rgba(black, 0.08);
                border: none;
            }
        }

        .footer {
            display: flex; 
            justify-content: 
            space-between; 
            align-items: center; 
            margin-top: 8px;
            .count { 
                color: #6b7280; 
                font-weight: 600;
            }
            .next { 
                padding: 10px 20px; 
                border-radius: 48px; 
                border: 0; 
                background: none; 
                color: #ff6a00; 
                font-size: 16px;
                font-weight: 700; 
                letter-spacing: -0.2px;
                cursor: pointer;
                transition: 0.2s ease;
                background: rgba(#ff6a00, 0.08);
                &:hover{
                    background: rgba(#ff6a00, 0.12);
                }
            }
        }
    }

    button{
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
            &:hover{
                opacity: 0.8;
            }
    }

    .results {
        max-width: 850px; 
        margin: 32px auto;
        padding: 0 16px;
        display: grid;
        gap: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        .json { background: #0b1020; color: #d1f3ff; padding: 16px; border-radius: 12px; overflow: auto; max-height: 60vh; display: none }
        .actions { 
            display: flex;
            flex-direction: column;
            gap: 4px;
            align-items: center;
        }
        .restart { 
            color: #ff6a00; 
            background: none;
            border: 0; 
            border-radius: 8px; 
            padding: 10px 14px; 
            font-weight: 550; 
            font-size: 14px;
            letter-spacing: -0.2px;
            cursor: pointer; 
            transition: 0.2s ease;
            &:hover{
                opacity: 0.8;
            }
        }
        .complete { 
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
            &:hover{
                opacity: 0.8;
            }
        }

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
             white-space: pre-wrap;
             font-size: 14px;
             letter-spacing: -0.2px;
             line-height: 1.4;
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

