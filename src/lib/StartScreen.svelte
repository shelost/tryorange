<script>
    import { fade } from 'svelte/transition';
    
    export let title = '';
    export let subtitle = '';
    export let onStart = () => {};
    export let gameType = 'word'; // 'word' or 'block'
    
    // Word game options
    export let selectedLength = 10;
    export let timePerWordMs = 6000;
    
    // Block game options  
    export let selectedDuration = 20;
    
    // Game-specific instructions
    let instructions = [];
    
    $: if (gameType === 'word') {
        instructions = [
            { text: 'Type the first word that comes to mind' }
        ];
    } else if (gameType === 'block') {
        instructions = [
            { 
                pellets: [
                    { color: 'green', text: '+2' },
                    { color: 'red', text: '-1' },
                    { color: 'yellow', text: 'Random (-5 to +10)' }
                ]
            },
            { text: 'Move your mouse to control the paddle • Arrow keys also work' }
        ];
    }
</script>

<section class="config" in:fade={{ duration: 200 }} out:fade={{ duration: 150 }}>
    <div class="mast">
        <h1 class="title">{title}</h1>
        <p class="hint">{subtitle}</p>
    </div>
    
    {#if gameType === 'block'}
        <div class="instructions">
            <div class="pellet-info">
                {#each instructions[0].pellets as pellet}
                    <div class="pellet-type">
                        <div class="pellet {pellet.color}"></div>
                        <span>{pellet.text}</span>
                    </div>
                {/each}
            </div>
            <p class="control-hint">{instructions[1].text}</p>
        </div>
    {/if}

    <div class="controls">
        {#if gameType === 'word'}
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
        {:else if gameType === 'block'}
            <label class="control">
                <span>Game Duration</span>
                <div class="options">
                    <button class:selected={selectedDuration === 20} on:click={() => (selectedDuration = 20)}>20s</button>
                    <button class:selected={selectedDuration === 40} on:click={() => (selectedDuration = 40)}>40s</button>
                    <button class:selected={selectedDuration === 60} on:click={() => (selectedDuration = 60)}>60s</button>
                </div>
            </label>
        {/if}
    </div>
    
    <button class="start" on:click={onStart}>
        {gameType === 'word' ? 'Start' : 'Play'}
    </button>
</section>

<style lang="scss">
    .config {
        max-width: 720px;
        margin: 48px auto;
        padding: 0 16px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        align-items: center;
    }

    .mast {
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

    .instructions {
        margin-bottom: 24px;
        text-align: center;

        .pellet-info {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .pellet-type {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
            font-size: 14px;
        }

        .pellet {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            
            &.green { background: #22c55e; }
            &.red { background: #ef4444; }
            &.yellow { background: #eab308; }
        }

        .control-hint {
            color: rgba(black, 0.5);
            font-size: 13px;
            margin: 0;
        }
    }

    .controls {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
        width: 100%;

        .control {
            display: grid;
            gap: 8px;
            justify-items: center;

            span {
                color: rgba(black, 0.4);
                font-weight: 550;
                font-size: 14px;
                letter-spacing: -0.25px;
            }

            .options {
                display: inline-flex;
                gap: 8px;
                background: #e5e7eb;
                padding: 6px;
                border-radius: 999px;

                > button {
                    border: 0;
                    background: transparent;
                    padding: 8px 14px;
                    border-radius: 999px;
                    cursor: pointer;
                    color: #4b5563;
                    font-weight: 600;
                    font-family: 'Inter', sans-serif;
                    
                    &.selected {
                        background: white;
                        color: #111827;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                    }
                }
            }
        }
    }

    .start {
        margin-top: 36px;
        font-size: 18px;
        width: 200px;
        font-family: 'Inter', sans-serif;
        background: #ff6a00;
        color: white;
        border: 0;
        border-radius: 48px;
        padding: 9.5px 24px 10px 24px;
        font-weight: 550;
        letter-spacing: -0.2px;
        transition: 0.2s ease;
        cursor: pointer;
        
        &:hover {
            opacity: 0.8;
        }
    }
</style>
