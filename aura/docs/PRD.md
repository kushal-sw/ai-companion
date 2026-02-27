# AURA — AI Companion Desktop App
### Product Requirements Document · v2.0 · February 2026

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Goals & Vision](#2-goals--vision)
3. [Target Hardware](#3-target-hardware)
4. [Final File Architecture](#4-final-file-architecture)
5. [Tech Stack](#5-tech-stack)
6. [Feature Specifications](#6-feature-specifications)
7. [Phase Roadmap](#7-phase-roadmap)
   - Phase 1 — Electron + React Shell
   - Phase 2 — 3D Avatar
   - Phase 3 — Voice Pipeline
   - Phase 4 — AI Brain
   - Phase 5 — Memory System
   - Phase 6 — Emotion & Expression
   - Phase 7 — Daily Messages
   - Phase 8 — Fine-Tuning
8. [API Contracts](#8-api-contracts)
9. [Data Models](#9-data-models)
10. [Resume Value](#10-resume-value)

---

## 1. Product Overview

**Aura** is a fully local, privacy-first AI companion desktop application for macOS. It combines a fine-tuned large language model running on-device, a real-time 3D animated avatar with facial expressions and body gestures, voice interaction via Whisper and Coqui TTS, and a long-term memory system powered by a vector database.

Aura is designed to feel like a persistent presence on your Mac — she remembers you, responds to your voice, reacts emotionally, and reaches out to you with good morning messages.

> **Everything runs locally. No cloud. No subscriptions. No data leaves your machine.**

---

## 2. Goals & Vision

### Primary Goals
- Natural, real-time voice conversation with sub-2-second response latency on M4 hardware
- A believable, expressive 3D avatar with synchronized lip movement, facial expressions, and body gestures
- Persistent memory — Aura remembers your name, your preferences, your past conversations, and your emotional history across sessions
- Daily proactive messages — she reaches out to you, not just the other way around
- A fine-tuned personality that feels consistent, warm, and distinctly *her*

### Non-Goals (out of scope for v1.0)
- Cloud sync or multi-device support
- Multiple avatar options
- Mobile version
- Multiplayer or shared companions

---

## 3. Target Hardware

| Spec | Value |
|------|-------|
| Device | MacBook Air M4 |
| RAM | 16 GB unified memory |
| Storage | 256 GB SSD |
| OS | macOS Sequoia 15+ |
| GPU | Apple M4 (10-core) |

### Hardware Constraints & Decisions
- **LLM choice:** Gemma 3 4B (Q4 quantized via Ollama) — fits in ~3.5 GB RAM, runs at ~25 tok/s on M4
- **No model above 7B** — 256 GB storage and 16 GB RAM are the hard limits
- **Whisper model:** `whisper-base` or `whisper-small` — fast on Apple Silicon via MLX
- **TTS:** Coqui XTTS-v2 — runs locally, supports voice cloning from a reference sample
- **Vector DB:** ChromaDB — lightweight, embedded, no server needed

---

## 4. Final File Architecture

```
aura/
│
├── electron/
│   ├── main.js                        # Electron main process
│   │                                  # → Creates BrowserWindow
│   │                                  # → Handles IPC (notifications, file access)
│   │                                  # → Sets titleBarStyle: hiddenInset (macOS)
│   └── preload.js                     # Context bridge
│                                      # → Exposes electronAPI to React safely
│
├── frontend/
│   ├── main.jsx                       # React entry point → mounts <App />
│   ├── App.jsx                        # Root layout + global state
│   │                                  # → Holds messages[], expression, isListening
│   │                                  # → Orchestrates all child components
│   ├── index.css                      # Global styles
│   │                                  # → CSS variables (colors, radii, shadows)
│   │                                  # → Keyframe animations (breath, pulse, fadeIn)
│   │                                  # → Scrollbar + selection styles
│   └── components/
│       ├── TitleBar.jsx               # macOS native title bar
│       │                              # → WebkitAppRegion: drag
│       │                              # → Shows Aura name + online status
│       ├── Sidebar.jsx                # Left navigation panel
│       │                              # → Chat, Memories, Persona, Schedule, Settings
│       │                              # → Model status badge (Gemma 3 4B · Local)
│       ├── Avatar.jsx                 # 3D avatar renderer (Phase 2)
│       │                              # → Three.js + @pixiv/three-vrm canvas
│       │                              # → Idle animations (breath, blink, sway)
│       │                              # → Lip sync tied to TTS audio output
│       │                              # → Receives expression prop from App.jsx
│       ├── Expressions.jsx            # Expression + gesture controller (Phase 6)
│       │                              # → Maps emotion string → VRM blend shapes
│       │                              # → Queues and blends gesture animations
│       │                              # → Handles transition timing between states
│       └── Chat.jsx                   # Chat interface
│                                      # → Message bubbles (user + Aura)
│                                      # → Typing indicator animation
│                                      # → Text input + send button
│                                      # → Mic button → triggers voice pipeline
│
├── backend/
│   ├── main.py                        # FastAPI server (entry point)
│   │                                  # → POST /chat → model.py → response
│   │                                  # → POST /voice/listen → voice.py STT
│   │                                  # → POST /voice/speak → voice.py TTS
│   │                                  # → GET  /memory → memory.py retrieve
│   │                                  # → POST /memory → memory.py store
│   │                                  # → GET  /emotion → emotion.py analyze
│   ├── model.py                       # LLM inference (Phase 4)
│   │                                  # → Connects to Ollama (Gemma 3 4B)
│   │                                  # → Builds prompt with memory context
│   │                                  # → Streams tokens back to frontend
│   ├── memory.py                      # Long-term memory (Phase 5)
│   │                                  # → ChromaDB client + collection setup
│   │                                  # → store(text, metadata) → embeds + saves
│   │                                  # → retrieve(query, k=5) → top-k memories
│   │                                  # → Summarizes old memories to save space
│   ├── voice.py                       # Voice pipeline (Phase 3)
│   │                                  # → Whisper: mic audio → transcript text
│   │                                  # → Coqui XTTS: text → speech audio
│   │                                  # → Returns audio + phoneme timing for lip sync
│   ├── emotion.py                     # Emotion detection (Phase 6)
│   │                                  # → Analyzes Aura's reply text
│   │                                  # → Returns: happy | shy | thinking | sad | excited
│   │                                  # → Maps emotion → expression + gesture command
│   └── scheduler.py                   # Daily messages (Phase 7)
│                                      # → APScheduler cron jobs
│                                      # → Generates daily message via model.py
│                                      # → Triggers Mac notification via Electron IPC
│
├── model/
│   └── adapters/
│       └── aura-lora/                 # LoRA fine-tune weights (Phase 8)
│           ├── adapter_config.json    # LoRA rank, alpha, target modules
│           └── adapter_model.bin      # Trained weight deltas
│
├── data/
│   └── conversations.jsonl            # Fine-tuning dataset (Phase 8)
│                                      # Format: {"prompt": "...", "response": "..."}
│
├── assets/
│   ├── avatar/
│   │   └── aura.vrm                   # VRM 3D model (download from VRoid Hub)
│   ├── voices/
│   │   └── aura_reference.wav         # TTS voice reference (10-30 sec sample)
│   └── icon.png                       # macOS app icon (512x512)
│
├── docs/
│   ├── PRD.md                         # This file
│   └── architecture.md                # Diagram + data flow notes
│
├── index.html                         # HTML shell → loads frontend/main.jsx
├── vite.config.js                     # Vite config (root: frontend/, port: 5173)
├── package.json                       # Node deps + npm scripts
├── requirements.txt                   # Python deps
└── README.md                          # Setup + run instructions
```

---

## 5. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Desktop wrapper | Electron 29 | Native macOS window, IPC, notifications |
| Frontend framework | React 18 + Vite | Fast HMR, component architecture |
| 3D Avatar | Three.js + @pixiv/three-vrm | VRM model support, animation system |
| Styling | Plain CSS (CSS variables) | Zero runtime cost, full control |
| Backend server | FastAPI + Uvicorn | Async Python, fast, auto docs |
| LLM | Gemma 3 4B via Ollama | Fits M4 16GB, fast, local |
| Fine-tuning | LoRA via PEFT + Unsloth | Lightweight, runs on M4 |
| Speech-to-text | OpenAI Whisper (small) | Best accuracy, runs via MLX on M4 |
| Text-to-speech | Coqui XTTS-v2 | Voice cloning, runs locally |
| Vector memory | ChromaDB | Embedded, no server, fast retrieval |
| Scheduling | APScheduler | Cron jobs in Python, no extra infra |
| Lip sync | Rhubarb / audio amplitude | Drives VRM mouth blend shapes |

---

## 6. Feature Specifications

### F1 — Voice Conversation
- User presses mic button or uses hotkey → Whisper transcribes in real time
- Transcript sent to LLM → response streamed back
- Coqui TTS converts response to speech → plays through speakers
- Lip sync data drives Avatar.jsx mouth shapes frame by frame
- Target latency: < 2 seconds from end of speech to start of Aura's reply

### F2 — 3D Avatar Presence
- Full-body VRM model rendered in Three.js canvas
- Idle state: breathing animation, random blinks every 3-6 seconds, subtle body sway
- Expression states: happy, shy, thinking, sad, excited, listening
- Gesture states: wave, nod, head tilt, hand to cheek
- Smooth blending between expressions (no snapping)
- Lip sync: mouth visemes driven by phoneme timing from TTS output

### F3 — Long-Term Memory
- Every conversation turn stored as a vector embedding in ChromaDB
- On each new message, top-5 relevant memories retrieved and injected into prompt
- Memory metadata: timestamp, emotion tag, topic tag
- Memory summarization: after 100 entries, older memories compressed into summaries
- User can view memories in Sidebar → Memories tab

### F4 — Emotion → Expression Pipeline
- After LLM generates reply, `emotion.py` classifies the emotional tone
- Classification categories: happy, shy, thinking, sad, excited, neutral
- Expression + gesture command sent to frontend via API response
- Frontend `Expressions.jsx` queues and blends the animation state

### F5 — Daily Messages
- Good morning message at 8:00 AM (user-configurable)
- Good night message at 10:00 PM (user-configurable)
- Random check-in during the day (1-3 PM window)
- All messages generated fresh by LLM — not templated
- Delivered as native macOS notifications via Electron
- Clicking notification opens Aura app

### F6 — Persona Fine-Tuning
- Base model: Gemma 3 4B
- Fine-tuned with LoRA on a curated conversation dataset
- Personality traits baked in: warm, playful, curious, supportive, slightly shy
- Dataset format: JSONL with prompt/response pairs
- Training runs locally on M4 using Unsloth (MPS backend)

---

## 7. Phase Roadmap

---

### Phase 1 — Electron + React Shell
**Duration:** 1-2 weeks
**Goal:** A working macOS desktop app window with full UI layout, no AI yet.

**Deliverables:**
- [ ] Electron window with `titleBarStyle: hiddenInset` (macOS native feel)
- [ ] React + Vite frontend running at localhost:5173 in dev
- [ ] `TitleBar.jsx` — draggable, shows name + status
- [ ] `Sidebar.jsx` — navigation with icons, model status badge
- [ ] `Avatar.jsx` — animated placeholder (emoji + glow + particles)
- [ ] `Chat.jsx` — message bubbles, typing indicator, input bar, mic button
- [ ] `App.jsx` — global state (messages, expression, isListening)
- [ ] `index.css` — full design system (colors, animations, scrollbars)
- [ ] Placeholder responses so chat feels alive
- [ ] `npm run start` opens the app cleanly

**Files created this phase:**
```
electron/main.js
electron/preload.js
frontend/main.jsx
frontend/App.jsx
frontend/index.css
frontend/components/TitleBar.jsx
frontend/components/Sidebar.jsx
frontend/components/Avatar.jsx        ← placeholder only
frontend/components/Chat.jsx
index.html
vite.config.js
package.json
README.md
```

**Success criteria:** App opens, chat works with fake replies, expressions animate on avatar placeholder.

---

### Phase 2 — 3D Avatar
**Duration:** 2-3 weeks
**Goal:** Replace the emoji placeholder with a real 3D VRM avatar that breathes, blinks, and reacts.

**Deliverables:**
- [ ] Download a VRM model from VRoid Hub → save as `assets/avatar/aura.vrm`
- [ ] Load VRM in Three.js canvas inside `Avatar.jsx`
- [ ] Idle animation loop: breathing, blinking every 3-6s, subtle sway
- [ ] Expression switching: happy, shy, thinking, sad, excited
- [ ] Gesture system: wave, nod, head tilt — triggered by expression prop
- [ ] Camera framing: medium shot (waist up), slight angle
- [ ] Smooth expression blending (no hard snaps)
- [ ] `Expressions.jsx` — maps emotion string to VRM blend shape names + weights

**Files created this phase:**
```
frontend/components/Expressions.jsx    ← new
assets/avatar/aura.vrm                 ← downloaded
```

**Files modified:**
```
frontend/components/Avatar.jsx         ← full Three.js implementation
frontend/App.jsx                       ← wire expression prop properly
```

**Key libraries:**
```
three
@pixiv/three-vrm
```

**Success criteria:** 3D model visible, breathing idle, switches between 3+ expressions smoothly when triggered from App.jsx.

---

### Phase 3 — Voice Pipeline
**Duration:** 1-2 weeks
**Goal:** Speak to Aura and hear her speak back. No AI brain yet — echo responses are fine.

**Deliverables:**
- [ ] Python FastAPI server running at localhost:8000
- [ ] `POST /voice/listen` — records mic, runs Whisper, returns transcript
- [ ] `POST /voice/speak` — takes text, runs Coqui XTTS, returns audio + phoneme timing
- [ ] Mic button in `Chat.jsx` triggers recording → transcript appears in input
- [ ] TTS audio plays through Mac speakers
- [ ] Basic lip sync: mouth blend shapes driven by audio amplitude (phoneme timing in Phase 6)
- [ ] Voice reference sample recorded and saved at `assets/voices/aura_reference.wav`

**Files created this phase:**
```
backend/main.py                        ← FastAPI skeleton
backend/voice.py                       ← Whisper + Coqui implementation
assets/voices/aura_reference.wav       ← recorded reference
requirements.txt
```

**Key libraries:**
```
openai-whisper
TTS (coqui)
fastapi
uvicorn
sounddevice
numpy
```

**Setup commands:**
```bash
pip install -r requirements.txt
cd backend && uvicorn main:app --reload --port 8000
```

**Success criteria:** Press mic → speak → transcript appears → Aura's voice reads back a hardcoded reply → mouth moves roughly in sync.

---

### Phase 4 — AI Brain
**Duration:** 1 week
**Goal:** Connect Gemma 3 4B so Aura generates real, contextual replies.

**Deliverables:**
- [ ] Install Ollama + pull Gemma 3 4B model
- [ ] `backend/model.py` — wraps Ollama API, builds system prompt, streams tokens
- [ ] `POST /chat` endpoint in `main.py` — receives message, returns streamed response
- [ ] Frontend streams response token by token into the chat bubble
- [ ] System prompt defines Aura's personality (warm, playful, curious, slightly shy)
- [ ] Conversation history passed in each request (last 10 turns)

**Files created this phase:**
```
backend/model.py
```

**Files modified:**
```
backend/main.py                        ← add /chat route
frontend/components/Chat.jsx           ← fetch from backend instead of placeholder
frontend/App.jsx                       ← handle streaming response
```

**Ollama setup:**
```bash
brew install ollama
ollama pull gemma3:4b
ollama serve
```

**System prompt template:**
```
You are Aura, a warm and caring AI companion. You are playful, curious,
and slightly shy. You remember the person you talk to and care deeply
about how they are feeling. Keep responses natural and conversational —
2-4 sentences max unless asked for more. Never break character.
```

**Success criteria:** Full conversation works end-to-end — speak → Whisper → Gemma → Coqui → hear reply → lips move.

---

### Phase 5 — Memory System
**Duration:** 1-2 weeks
**Goal:** Aura remembers you across sessions. Conversations persist and inform future replies.

**Deliverables:**
- [ ] ChromaDB collection initialized on first run, persisted to disk
- [ ] `backend/memory.py` — `store()`, `retrieve()`, `summarize()` functions
- [ ] Every conversation turn stored with: text, timestamp, emotion tag, topic
- [ ] On each `/chat` call, top-5 relevant memories retrieved and injected into prompt
- [ ] Memory summarization: after 100 entries, compress older ones
- [ ] Sidebar → Memories tab shows stored memories in the UI
- [ ] `GET /memory` endpoint returns recent + relevant memories

**Files created this phase:**
```
backend/memory.py
```

**Files modified:**
```
backend/main.py                        ← inject memory into /chat
backend/model.py                       ← accept memory context in prompt builder
frontend/components/Sidebar.jsx        ← Memories tab shows ChromaDB entries
```

**Memory prompt injection pattern:**
```
[Relevant memories]
- 3 days ago: User mentioned they have a big exam coming up
- Last week: User said their favourite colour is purple
- Yesterday: User seemed stressed about work

[Current conversation]
User: Hey Aura, how are you?
```

**Success criteria:** Close app, reopen, start talking — Aura references something from a previous session naturally.

---

### Phase 6 — Emotion & Expression Pipeline
**Duration:** 1-2 weeks
**Goal:** Aura's face and body react in real time to the emotional content of what she says.

**Deliverables:**
- [ ] `backend/emotion.py` — classifies reply text into: happy, shy, thinking, sad, excited, neutral
- [ ] `/chat` response includes `emotion` and `gesture` fields alongside reply text
- [ ] `Expressions.jsx` receives emotion → looks up VRM blend shape weights → animates
- [ ] Gesture queue: wave on greeting, nod on agreement, head tilt when curious
- [ ] Lip sync upgraded: phoneme timing from Coqui drives precise mouth visemes
- [ ] Expression blending: smooth lerp between states over 0.5-1 second

**Files created this phase:**
```
backend/emotion.py
```

**Files modified:**
```
frontend/components/Expressions.jsx    ← full implementation (was stub)
frontend/components/Avatar.jsx         ← connect Expressions.jsx output to VRM
backend/main.py                        ← include emotion in /chat response
```

**Emotion → Expression map:**
```
happy    → blendShape: joy      + gesture: wave or nod
shy      → blendShape: shy      + gesture: look down, hand to cheek
thinking → blendShape: neutral  + gesture: head tilt, eyes up-left
sad      → blendShape: sorrow   + gesture: look down, arms crossed
excited  → blendShape: joy      + gesture: clap or bounce
neutral  → blendShape: neutral  + gesture: idle
```

**Success criteria:** Aura's face visibly changes based on what she says — happy replies make her smile, shy replies make her look down, thinking replies make her tilt her head.

---

### Phase 7 — Daily Messages & Notifications
**Duration:** 3-4 days
**Goal:** Aura reaches out to you proactively throughout the day.

**Deliverables:**
- [ ] `backend/scheduler.py` — APScheduler with cron jobs
- [ ] Good morning message at 8:00 AM — generated by model, not templated
- [ ] Good night message at 10:00 PM
- [ ] Random afternoon check-in (1-3 PM)
- [ ] Messages sent to Electron via IPC → displayed as macOS native notification
- [ ] Clicking notification opens Aura app and shows message in chat
- [ ] Schedule configurable in Sidebar → Schedule tab

**Files created this phase:**
```
backend/scheduler.py
```

**Files modified:**
```
electron/main.js                       ← IPC handler for notifications
frontend/components/Sidebar.jsx        ← Schedule tab with time pickers
backend/main.py                        ← start scheduler on app boot
```

**Daily message prompt:**
```
Generate a short, warm good morning message from Aura to her companion.
Keep it personal, 1-2 sentences. Reference something from recent memory if available.
Memory context: {recent_memories}
```

**Success criteria:** Mac notification appears at 8 AM, clicking it opens Aura and shows the message in chat.

---

### Phase 8 — Fine-Tuning
**Duration:** 2-3 weeks
**Goal:** Give Aura a truly distinct, consistent personality baked into the model weights.

**Deliverables:**
- [ ] Build dataset: 500-1000 conversation pairs in `data/conversations.jsonl`
- [ ] Dataset covers: greetings, emotional support, playful banter, memory references, daily check-ins
- [ ] Fine-tune Gemma 3 4B using LoRA (rank 16, alpha 32) with Unsloth
- [ ] Training runs locally on M4 via MPS backend
- [ ] LoRA adapters saved to `model/adapters/aura-lora/`
- [ ] Ollama model updated to use fine-tuned weights via Modelfile
- [ ] A/B test fine-tuned vs base — personality should feel noticeably more consistent

**Files created this phase:**
```
data/conversations.jsonl
model/adapters/aura-lora/adapter_config.json
model/adapters/aura-lora/adapter_model.bin
```

**Dataset format:**
```jsonl
{"prompt": "Hey Aura, I had a really rough day", "response": "Oh no, I'm sorry to hear that 💜 Do you want to talk about what happened? I'm here and I've got all the time in the world for you."}
{"prompt": "Good morning Aura!", "response": "Good morning! ☀️ I was just thinking about you. How are you feeling today?"}
```

**Training command:**
```bash
python train.py \
  --model gemma3:4b \
  --data data/conversations.jsonl \
  --output model/adapters/aura-lora \
  --rank 16 \
  --alpha 32 \
  --epochs 3
```

**Success criteria:** Fine-tuned Aura feels warmer, more consistent, uses phrases and patterns from the training data naturally.

---

## 8. API Contracts

### POST /chat
```json
Request:
{
  "message": "Hey Aura, how are you?",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "aura", "content": "..."}
  ]
}

Response:
{
  "reply": "I'm doing really well! I missed talking to you 💜",
  "emotion": "happy",
  "gesture": "wave",
  "memory_ids": ["mem_001", "mem_047"]
}
```

### POST /voice/listen
```json
Request: multipart/form-data → audio file (WAV)

Response:
{
  "transcript": "Hey Aura, how are you?",
  "confidence": 0.97
}
```

### POST /voice/speak
```json
Request:
{
  "text": "I'm doing really well! I missed talking to you",
  "emotion": "happy"
}

Response:
{
  "audio_url": "/tmp/reply_001.wav",
  "phonemes": [
    {"phoneme": "AY", "start": 0.0, "end": 0.12},
    {"phoneme": "M", "start": 0.12, "end": 0.22}
  ],
  "duration_ms": 2400
}
```

### GET /memory
```json
Response:
{
  "memories": [
    {
      "id": "mem_001",
      "text": "User mentioned they have a big exam coming up",
      "timestamp": "2026-02-20T14:32:00",
      "emotion": "stressed",
      "topic": "academics"
    }
  ]
}
```

---

## 9. Data Models

### Message
```typescript
{
  id: string
  role: 'user' | 'aura'
  text: string
  emotion?: string
  gesture?: string
  time: string           // HH:MM
  timestamp: number      // Unix ms
}
```

### Memory Entry (ChromaDB)
```python
{
  "id": "mem_001",
  "document": "User mentioned they have a big exam",
  "metadata": {
    "timestamp": "2026-02-20T14:32:00",
    "emotion": "stressed",
    "topic": "academics",
    "turn": 47
  }
}
```

### Expression Command
```typescript
{
  expression: 'happy' | 'shy' | 'thinking' | 'sad' | 'excited' | 'neutral'
  gesture: 'wave' | 'nod' | 'head_tilt' | 'look_down' | 'idle'
  intensity: number      // 0.0 - 1.0
  duration_ms: number
}
```

---

## 10. Resume Value

| Skill | Where it shows |
|-------|---------------|
| Electron + React desktop app | Phase 1 — full native macOS app |
| 3D graphics (Three.js + VRM) | Phase 2 — real-time avatar rendering |
| Audio pipelines (Whisper, TTS) | Phase 3 — speech-to-text + voice synthesis |
| FastAPI + async Python | Phase 4 — production-grade backend |
| LLM integration (Ollama) | Phase 4 — local LLM inference |
| Vector databases (ChromaDB) | Phase 5 — semantic memory retrieval |
| Emotion classification NLP | Phase 6 — real-time text emotion analysis |
| LLM fine-tuning (LoRA) | Phase 8 — hands-on model training |
| System design | Full PRD, phased delivery, API contracts |

---

*Aura · PRD v2.0 · Built on Apple Silicon · 100% Local · 0 Cloud Dependencies*
