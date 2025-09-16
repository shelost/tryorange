<script>
    import { onMount, onDestroy } from 'svelte';
    import { getInterleavedWords } from '$lib/word_bank.js';
    import { fade, fly, scale } from 'svelte/transition';
    import { enhance } from '$app/forms';
    import StartScreen from '$lib/StartScreen.svelte';
    import ResultsScreen from '$lib/ResultsScreen.svelte';

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

<div class="game-container">
    {#if !started && !finished}
        <div in:fade={{ duration: 300, delay: 200 }} out:fade={{ duration: 200 }}>
            <StartScreen
                title="Word Association"
                subtitle="Type the first word that comes to mind"
                gameType="word"
                bind:selectedLength
                bind:timePerWordMs
                onStart={startGame}
            />
        </div>
    {/if}

    {#if started}
        <div in:fade={{ duration: 300, delay: 200 }} out:fade={{ duration: 200 }}>
            <section class="slide" role="application">
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
        </div>
    {/if}

    {#if finished}
        <div in:fade={{ duration: 300, delay: 200 }} out:fade={{ duration: 200 }}>
            <ResultsScreen
                gameType="word"
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
            <pre class="json">{resultsJson}</pre>
        </div>
    {/if}
</div>
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

    .game-container {
        position: relative;
        width: 100%;
        min-height: 80vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        
        > div {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 80vh;
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

    .json { 
        background: #0b1020; 
        color: #d1f3ff; 
        padding: 16px; 
        border-radius: 12px; 
        overflow: auto; 
        max-height: 60vh; 
        display: none;
        max-width: 850px; 
        margin: 16px auto;
    }

    .exit-button {
        position: fixed; right: 20px; top: 20px;
        padding: 10px 16px; border-radius: 999px; border: 0; background: #ef4444; color: white; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
</style>

