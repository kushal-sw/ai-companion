import re

# ══════════════════════════════════════════════════════════════════
# Enhanced Emotion Classifier — Weighted keywords + phrase matching
# + sentiment fallback for much more frequent emotion detection
# ══════════════════════════════════════════════════════════════════

# Weight tiers: strong = 3, moderate = 2, weak = 1
# Format: list of (keyword_or_phrase, weight)
_EMOTION_KEYWORDS = {
    "happy": [
        # Strong (3) — unambiguous happiness
        ("love", 3), ("haha", 3), ("hehe", 3), ("yay", 3), ("hooray", 3),
        ("wonderful", 3), ("amazing", 3), ("fantastic", 3), ("brilliant", 3),
        ("thrilled", 3), ("delighted", 3), ("overjoyed", 3),
        ("❤", 3), ("💜", 3), ("😊", 3), ("😄", 3), ("☀️", 3), ("✨", 3),
        ("💕", 3), ("🥰", 3), ("😍", 3), ("💗", 3), ("🌸", 3),
        # Moderate (2)
        ("happy", 2), ("glad", 2), ("great", 2), ("awesome", 2), ("enjoy", 2),
        ("smile", 2), ("laugh", 2), ("beautiful", 2), ("lovely", 2),
        ("sweet", 2), ("pleased", 2), ("fun", 2), ("celebrate", 2),
        ("proud", 2), ("congratulations", 2), ("congrats", 2),
        ("grateful", 2), ("thankful", 2), ("blessed", 2), ("sunshine", 2),
        ("adorable", 2), ("perfect", 2), ("good news", 2), ("of course", 2),
        # Weak (1) — context-dependent
        ("good", 1), ("nice", 1), ("cool", 1), ("fine", 1), ("okay", 1),
        ("warm", 1), ("cozy", 1), ("cute", 1), ("kind", 1), ("care", 1),
        ("appreciate", 1), ("thank", 1), ("welcome", 1), ("excited", 1),
        # Phrases (3) — multi-word indicators
        ("i'm so happy", 3), ("makes me smile", 3), ("that's wonderful", 3),
        ("i love that", 3), ("so glad", 3), ("warms my heart", 3),
        ("i'm here for you", 3), ("brightens my day", 3), ("means a lot", 3),
        ("you're the best", 3), ("that's great", 2), ("so sweet", 2),
        ("how lovely", 2), ("that's so nice", 2), ("i appreciate", 2),
        ("glad to hear", 2), ("good to know", 2), ("that makes me", 2),
    ],
    "shy": [
        # Strong (3)
        ("blush", 3), ("flustered", 3), ("oh my gosh", 3), ("oh gosh", 3),
        ("you're making me", 3), ("stop it", 3), ("🙈", 3), ("😳", 3),
        ("👉👈", 3), ("flattering", 3),
        # Moderate (2)
        ("shy", 2), ("embarrass", 2), ("flatter", 2), ("oh my", 2),
        ("aww", 2), ("nervous", 2), ("a little", 2), ("kinda", 2),
        ("compliment", 2), ("you're sweet", 2), ("you're kind", 2),
        ("that's nice of you", 2), ("i mean", 2), ("well um", 2),
        # Weak (1) — hedging language
        ("um", 1), ("uh", 1), ("i guess", 1), ("maybe", 1),
        ("sort of", 1), ("kind of", 1), ("not really", 1),
        # Phrases (3)
        ("you're too kind", 3), ("oh stop", 3), ("that's so sweet of you", 3),
        ("i don't know what to say", 3), ("you're making me blush", 3),
        ("oh you", 2), ("i appreciate that", 2), ("well i", 1),
    ],
    "thinking": [
        # Strong (3)
        ("hmm", 3), ("hmmm", 3), ("interesting", 3), ("curious", 3),
        ("let me think", 3), ("good question", 3), ("i wonder", 3),
        ("🤔", 3), ("💭", 3),
        # Moderate (2)
        ("think", 2), ("consider", 2), ("wonder", 2), ("ponder", 2),
        ("perhaps", 2), ("might", 2), ("could be", 2), ("not sure", 2),
        ("analyze", 2), ("figure out", 2), ("understand", 2),
        ("explain", 2), ("perspective", 2), ("opinion", 2), ("idea", 2),
        ("actually", 2), ("well", 2), ("honestly", 2),
        # Weak (1)
        ("maybe", 1), ("question", 1), ("reason", 1), ("logic", 1),
        ("what if", 1), ("how does", 1), ("why", 1), ("suppose", 1),
        # Phrases (3)
        ("let me see", 3), ("that's a good point", 3), ("now that i think", 3),
        ("on one hand", 3), ("i've been thinking", 3), ("come to think of it", 3),
        ("that reminds me", 2), ("speaking of which", 2), ("if i recall", 2),
        ("it depends", 2), ("in a way", 2), ("from my perspective", 2),
    ],
    "sad": [
        # Strong (3) — clear negative emotions
        ("cry", 3), ("crying", 3), ("tears", 3), ("heartbreak", 3),
        ("depressed", 3), ("devastated", 3), ("horrible", 3), ("terrible", 3),
        ("awful", 3), ("miserable", 3), ("😢", 3), ("😞", 3), ("💔", 3),
        ("😔", 3), ("😭", 3),
        # Moderate (2)
        ("sad", 2), ("sorry", 2), ("miss", 2), ("lonely", 2), ("alone", 2),
        ("hurt", 2), ("pain", 2), ("difficult", 2), ("tough", 2),
        ("struggle", 2), ("worry", 2), ("worried", 2), ("anxious", 2),
        ("stress", 2), ("stressed", 2), ("afraid", 2), ("scared", 2),
        ("disappointed", 2), ("unfortunate", 2), ("regret", 2), ("loss", 2),
        ("lost", 2), ("broken", 2), ("upset", 2), ("overwhelm", 2),
        # Weak (1)
        ("tired", 1), ("exhausted", 1), ("down", 1), ("hard", 1),
        ("rough", 1), ("bad", 1), ("wish", 1), ("sigh", 1),
        # Phrases (3)
        ("i'm so sorry", 3), ("that's really hard", 3), ("i'm here for you", 3),
        ("don't worry", 3), ("it's okay to feel", 3), ("i understand how", 3),
        ("rough day", 3), ("bad day", 3), ("not okay", 3), ("hard time", 3),
        ("hang in there", 3), ("sending hugs", 3), ("my heart goes out", 3),
        ("that must be", 2), ("i can imagine", 2), ("take care of yourself", 2),
        ("it'll be okay", 2), ("i wish i could", 2), ("feel better", 2),
    ],
    "excited": [
        # Strong (3) — high-energy indicators
        ("omg", 3), ("oh my god", 3), ("incredible", 3), ("unbelievable", 3),
        ("mind blown", 3), ("let's go", 3), ("can't wait", 3),
        ("🎉", 3), ("🎊", 3), ("🤩", 3), ("🚀", 3), ("💥", 3),
        ("⚡", 3), ("🔥", 3), ("!!", 3), ("!!!", 3),
        # Moderate (2)
        ("excited", 2), ("wow", 2), ("amazing", 2), ("epic", 2),
        ("insane", 2), ("super", 2), ("phenomenal", 2), ("extraordinary", 2),
        ("spectacular", 2), ("finally", 2), ("best", 2), ("so cool", 2),
        ("absolutely", 2), ("definitely", 2), ("totally", 2),
        # Weak (1)
        ("awesome", 1), ("really", 1), ("extremely", 1), ("very", 1),
        ("quite", 1), ("pretty", 1),
        # Phrases (3)
        ("i can't believe", 3), ("this is amazing", 3), ("so exciting", 3),
        ("i'm so pumped", 3), ("that's incredible", 3), ("no way", 3),
        ("how exciting", 3), ("that's so cool", 3), ("tell me everything", 3),
        ("i love this", 3), ("you won't believe", 2), ("guess what", 2),
    ],
}

# ── Sentiment fallback words ──
# When no keyword matches above threshold, use overall sentiment
_POSITIVE_WORDS = {
    "good", "great", "nice", "well", "like", "love", "happy", "glad",
    "sure", "yes", "yeah", "right", "exactly", "thanks", "thank",
    "please", "welcome", "enjoy", "hope", "best", "better", "always",
    "together", "friend", "special", "remember", "smile", "bright",
}
_NEGATIVE_WORDS = {
    "no", "not", "never", "bad", "wrong", "hard", "difficult", "pain",
    "hurt", "sad", "sorry", "miss", "worry", "problem", "trouble",
    "hate", "can't", "won't", "don't", "shouldn't", "unfortunately",
    "worse", "worst", "fail", "afraid", "scare", "alone", "lost",
}

# ── Context-aware gesture rules ──
_GREETING_PATTERNS = re.compile(
    r"\b(hi|hey|hello|good morning|good evening|good night|howdy|greetings|welcome|what's up|sup)\b",
    re.IGNORECASE,
)
_AGREEMENT_PATTERNS = re.compile(
    r"\b(yes|yeah|yep|sure|absolutely|definitely|of course|right|exactly|agree|correct|true|indeed|certainly)\b",
    re.IGNORECASE,
)
_CURIOSITY_PATTERNS = re.compile(
    r"\b(hmm|interesting|curious|wonder|what if|tell me more|really\?|how come|i see|that's fascinating)\b",
    re.IGNORECASE,
)
_AFFECTION_PATTERNS = re.compile(
    r"\b(i love|love you|you're sweet|you're the best|you mean|care about|thinking of you|miss you)\b",
    re.IGNORECASE,
)
_COMFORT_PATTERNS = re.compile(
    r"\b(don't worry|it's okay|i'm here|hang in there|you're not alone|i understand|take care)\b",
    re.IGNORECASE,
)

# Emotion → gesture mapping (uses keyframe animation names)
_EMOTION_GESTURE_MAP = {
    "happy": "nod",
    "shy": "look_down",
    "thinking": "head_tilt",
    "sad": "look_down",
    "excited": "bounce",
    "neutral": "idle",
}

_EMOTION_INTENSITY_MAP = {
    "happy": 0.9,
    "shy": 0.8,
    "thinking": 0.75,
    "sad": 0.85,
    "excited": 1.0,
    "neutral": 0.4,
}

# Detection threshold — minimum weighted score to trigger an emotion
_MIN_SCORE_THRESHOLD = 2


def analyze_emotion(text: str) -> str:
    """Classify text into an emotion using weighted keyword matching + sentiment fallback."""
    text_lower = text.lower()
    scores = {}

    for emotion, keyword_list in _EMOTION_KEYWORDS.items():
        score = 0
        for entry in keyword_list:
            kw, weight = entry
            if kw in text_lower:
                score += weight
        scores[emotion] = score

    best = max(scores, key=scores.get)

    # If the best score meets threshold, use it
    if scores[best] >= _MIN_SCORE_THRESHOLD:
        return best

    # ── Sentiment fallback ──
    words = set(re.findall(r"[a-z']+", text_lower))
    pos = len(words & _POSITIVE_WORDS)
    neg = len(words & _NEGATIVE_WORDS)

    if pos > neg and pos >= 2:
        return "happy"
    if neg > pos and neg >= 2:
        return "sad"
    if pos > 0 and neg == 0:
        return "happy"
    if neg > 0 and pos == 0:
        return "sad"

    # Even the fallback didn't trigger — check for punctuation energy
    if text.count("!") >= 2:
        return "excited"
    if "?" in text:
        return "thinking"

    return "neutral"


def map_gesture(emotion: str, text: str) -> str:
    """Pick a gesture — context-specific patterns override emotion defaults."""
    if _GREETING_PATTERNS.search(text):
        return "wave"
    if _AFFECTION_PATTERNS.search(text):
        return "nod"
    if _COMFORT_PATTERNS.search(text):
        return "look_down"
    if _AGREEMENT_PATTERNS.search(text):
        return "nod"
    if _CURIOSITY_PATTERNS.search(text):
        return "head_tilt"

    return _EMOTION_GESTURE_MAP.get(emotion, "idle")


def analyze(text: str) -> dict:
    """Full analysis: emotion + gesture + intensity."""
    emotion = analyze_emotion(text)
    gesture = map_gesture(emotion, text)
    intensity = _EMOTION_INTENSITY_MAP.get(emotion, 0.5)
    return {
        "emotion": emotion,
        "gesture": gesture,
        "intensity": intensity,
    }
