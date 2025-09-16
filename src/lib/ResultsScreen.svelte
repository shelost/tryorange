<script>
    import { fade } from 'svelte/transition';
    import PentagonChart from './PentagonChart.svelte';
    
    export let title = 'Here are your results!';
    export let gameType = 'word'; // 'word' or 'block'
    export let finalScore = null; // Only for block game
    export let analysisLoading = false;
    export let analysisResult = null;
    export let analysisError = null;
    export let labels = ['Creativity', 'Optimism', 'Anxiety', 'Pragmatism', 'Spontaneity'];
    export let onComplete = () => {};
    export let onRestart = () => {};
    
    // Simple markdown parser for bold and italic text
    function parseMarkdown(text) {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+?)\*/g, '<em>$1</em>');
    }
</script>

<section class="results" in:fade={{ duration: 150 }} out:fade={{ duration: 120 }}>
    <h2 class="title">{title}</h2>
    
    {#if gameType === 'block' && finalScore !== null}
        <div class="final-score">Final Score: {finalScore}</div>
    {/if}

    {#if analysisLoading}
        <div class="loading" in:fade>
            {gameType === 'word' ? 'Generating your analysis...' : 'Analyzing your gameplay...'}
        </div>
    {/if}

    <div class="analysis-container">
        <PentagonChart 
            scores={analysisResult?.scores} 
            {labels}
            loading={analysisLoading}
            size={400}
        />
        
        {#if analysisResult?.summary}
            <div class="analysis-result" in:fade>
                <p>{@html parseMarkdown(analysisResult.summary)}</p>
            </div>
        {:else if analysisLoading}
            <div class="analysis-placeholder">
                <div class="placeholder-lines">
                    <div class="placeholder-line"></div>
                    <div class="placeholder-line"></div>
                    <div class="placeholder-line short"></div>
                </div>
            </div>
        {/if}
    </div>

    {#if analysisError}
        <div class="analysis-error" in:fade>
            <p>Sorry, there was an error generating your analysis: {analysisError}</p>
        </div>
    {/if}

    <div class="actions">
        <button class="complete" on:click={onComplete}>Complete</button>
        <button class="restart" on:click={onRestart}>
            {gameType === 'word' ? 'Retry' : 'Play Again'}
        </button>
    </div>
</section>

<style lang="scss">
    .results {
        max-width: 850px;
        margin: 32px auto;
        padding: 0 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;

        .title {
            font-size: 28px;
            font-weight: 700;
            margin: 0;
        }

        .final-score {
            font-size: 24px;
            font-weight: 600;
            color: #ff6a00;
            margin-bottom: 16px;
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

        .analysis-placeholder {
            width: 100%;
            max-width: 400px;
            
            .placeholder-lines {
                display: flex;
                flex-direction: column;
                gap: 12px;
                
                .placeholder-line {
                    height: 16px;
                    background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
                    background-size: 200% 100%;
                    border-radius: 4px;
                    animation: shimmer 1.5s infinite;
                    
                    &.short {
                        width: 70%;
                    }
                }
            }
        }

        .analysis-error {
            background: #fee2e2;
            border: 1px solid #fca5a5;
            color: #b91c1c;
            padding: 1rem 1.5rem;
            border-radius: 12px;
        }

        .actions {
            display: flex;
            flex-direction: column;
            gap: 4px;
            align-items: center;
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
            font-family: 'Inter', sans-serif;
            
            &:hover {
                opacity: 0.8;
            }
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
            font-family: 'Inter', sans-serif;
            
            &:hover {
                opacity: 0.8;
            }
        }
    }
    
    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
</style>
