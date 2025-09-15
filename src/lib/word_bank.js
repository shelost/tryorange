// Large categorized word bank and helpers for generating randomized sequences

/** Emotions and feelings */
const emotionsPositive = [
    "joy", "love", "peace", "hope", "pride", "gratitude", "relief", "amusement", "excitement", "curiosity",
    "affection", "comfort", "serenity", "delight", "gladness", "satisfaction", "optimism", "confidence", "trust", "admiration",
    "awe", "inspiration", "enthusiasm", "calm", "kindness", "compassion", "empathy", "tenderness", "forgiveness", "warmth",
    "harmony", "belonging", "security", "safety", "freedom", "wonder", "interest", "playfulness", "cheer", "contentment"
];

const emotionsNegative = [
    "anger", "fear", "sadness", "shame", "guilt", "envy", "jealousy", "disgust", "anxiety", "worry",
    "stress", "loneliness", "grief", "regret", "frustration", "boredom", "resentment", "bitterness", "exhaustion", "doubt",
    "insecurity", "embarrassment", "panic", "dread", "hurt", "rejection", "isolation", "rage", "impatience", "irritation",
    "apathy", "despair", "hopelessness", "homesickness", "nostalgia", "melancholy", "skepticism", "cynicism", "alarm", "suspicion"
];

/** Personality traits and values */
const traitsValues = [
    "honesty", "loyalty", "courage", "humility", "ambition", "creativity", "discipline", "patience", "generosity", "integrity",
    "fairness", "justice", "curiosity", "leadership", "resilience", "perseverance", "open-mindedness", "spontaneity", "prudence", "adaptability",
    "authenticity", "diligence", "focus", "kindness", "reliability", "wit", "humor", "self-reliance", "independence", "cooperation",
    "altruism", "respect", "tolerance", "grit", "balance", "moderation", "assertiveness", "confidence", "mindfulness", "flexibility"
];

/** People and social */
const social = [
    "family", "friend", "stranger", "ally", "rival", "leader", "follower", "team", "community", "crowd",
    "mentor", "student", "teacher", "parent", "child", "sibling", "partner", "neighbor", "colleague", "customer",
    "audience", "fan", "critic", "supporter", "volunteer", "host", "guest", "winner", "loser", "peacemaker"
];

/** Nature, animals, and places */
const nature = [
    "forest", "ocean", "mountain", "river", "desert", "valley", "island", "meadow", "waterfall", "canyon",
    "prairie", "tundra", "reef", "glacier", "volcano", "savanna", "swamp", "lagoon", "grove", "cliff",
    "beach", "shore", "dune", "cave", "cove", "rainforest", "marsh", "bay", "delta", "peak"
];

const animals = [
    "lion", "tiger", "bear", "eagle", "wolf", "fox", "owl", "dolphin", "whale", "shark",
    "elephant", "giraffe", "zebra", "rhino", "hippo", "panther", "leopard", "cheetah", "buffalo", "antelope",
    "penguin", "seal", "otter", "koala", "kangaroo", "panda", "camel", "horse", "dog", "cat",
    "sparrow", "hawk", "falcon", "swan", "goose", "duck", "rabbit", "mouse", "squirrel", "deer"
];

const places = [
    "home", "school", "office", "market", "hospital", "airport", "station", "library", "museum", "park",
    "theater", "stadium", "cafe", "restaurant", "hotel", "factory", "farm", "church", "temple", "mosque",
    "city", "village", "suburb", "downtown", "harbor", "port", "bridge", "tunnel", "tower", "plaza"
];

/** Objects and technology */
const objects = [
    "book", "chair", "table", "lamp", "mirror", "clock", "door", "window", "phone", "laptop",
    "keyboard", "mouse", "camera", "bottle", "glass", "cup", "plate", "spoon", "fork", "knife",
    "backpack", "wallet", "watch", "pen", "pencil", "notebook", "guitar", "piano", "violin", "drum",
    "bicycle", "car", "bus", "train", "rocket", "ship", "subway", "skateboard", "helmet", "umbrella"
];

const technology = [
    "internet", "network", "server", "database", "algorithm", "password", "encryption", "robot", "satellite", "sensor",
    "software", "hardware", "cloud", "blockchain", "drone", "quantum", "virtual", "augmented", "battery", "solar",
    "wireless", "signal", "protocol", "browser", "search", "engine", "api", "compiler", "debugger", "stream"
];

/** Abstract concepts */
const abstractConcepts = [
    "time", "memory", "identity", "freedom", "destiny", "choice", "fate", "truth", "beauty", "power",
    "knowledge", "wisdom", "belief", "doubt", "chaos", "order", "silence", "noise", "balance", "change",
    "growth", "decay", "mortality", "legacy", "purpose", "meaning", "luck", "risk", "opportunity", "threat"
];

/** Activities and work */
const actions = [
    "run", "walk", "jump", "swim", "climb", "read", "write", "sing", "dance", "laugh",
    "cry", "think", "plan", "build", "design", "paint", "cook", "bake", "drive", "code",
    "study", "teach", "learn", "train", "compete", "rest", "meditate", "negotiate", "lead", "follow"
];

const workStudy = [
    "project", "deadline", "meeting", "presentation", "research", "experiment", "report", "thesis", "exam", "assignment",
    "internship", "promotion", "salary", "budget", "contract", "startup", "career", "apprentice", "schedule", "feedback"
];

/** Daily life and culture */
const food = [
    "bread", "rice", "pasta", "soup", "salad", "pizza", "burger", "sushi", "taco", "noodle",
    "apple", "banana", "orange", "grape", "strawberry", "blueberry", "mango", "pineapple", "peach", "pear",
    "carrot", "tomato", "potato", "onion", "garlic", "pepper", "cheese", "yogurt", "butter", "chocolate"
];

const artsSports = [
    "painting", "sculpture", "poetry", "novel", "cinema", "theater", "music", "opera", "ballet", "jazz",
    "soccer", "basketball", "tennis", "baseball", "golf", "boxing", "swimming", "cycling", "running", "yoga"
];

const healthBody = [
    "sleep", "diet", "exercise", "energy", "breath", "heart", "mind", "body", "muscle", "bone",
    "immune", "therapy", "medicine", "injury", "recovery", "strength", "posture", "balance", "focus", "habit"
];

const weatherTime = [
    "sun", "moon", "star", "cloud", "rain", "storm", "thunder", "lightning", "snow", "fog",
    "spring", "summer", "autumn", "winter", "dawn", "dusk", "midnight", "noon", "yesterday", "tomorrow"
];

const moneyPolitics = [
    "money", "debt", "tax", "trade", "market", "investment", "inflation", "recession", "policy", "law",
    "vote", "election", "freedom", "rights", "duty", "power", "authority", "justice", "order", "reform"
];

const travel = [
    "journey", "adventure", "map", "compass", "ticket", "passport", "luggage", "hotel", "tour", "guide",
    "bridge", "road", "highway", "tunnel", "harbor", "port", "island", "border", "customs", "visa"
];

// Aggregate and ensure uniqueness
const wordBankSet = new Set([
    ...emotionsPositive,
    ...emotionsNegative,
    ...traitsValues,
    ...social,
    ...nature,
    ...animals,
    ...places,
    ...objects,
    ...technology,
    ...abstractConcepts,
    ...actions,
    ...workStudy,
    ...food,
    ...artsSports,
    ...healthBody,
    ...weatherTime,
    ...moneyPolitics,
    ...travel
]);

export const wordBank = Array.from(wordBankSet);

/**
 * Fisher–Yates shuffle (in-place)
 * @param {string[]} arr
 */
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

/**
 * Returns a randomized sequence of unique words of the requested length.
 * If count exceeds the bank, it returns the entire bank shuffled.
 * @param {number} count
 */
export function getRandomWords(count) {
    const safeCount = Math.max(1, Math.min(count, wordBank.length));
    const copy = wordBank.slice();
    shuffleArray(copy);
    return copy.slice(0, safeCount);
}

/**
 * Returns an iterator-friendly sequence with category diversity by interleaving groups.
 * This can help analysis by mixing domains and reducing priming effects.
 * @param {number} count
 */
export function getInterleavedWords(count) {
    const categories = [
        emotionsPositive, emotionsNegative, traitsValues, social, nature, animals,
        places, objects, technology, abstractConcepts, actions, workStudy, food,
        artsSports, healthBody, weatherTime, moneyPolitics, travel
    ];
    const pools = categories.map(list => list.slice());
    pools.forEach(shuffleArray);
    const result = [];
    let idx = 0;
    while (result.length < Math.min(count, wordBank.length)) {
        const pool = pools[idx % pools.length];
        if (pool.length > 0) result.push(pool.pop());
        idx++;
    }
    return result;
}


