 Aura — Interactive AI Desktop Assistant

Aura is a privacy-focused conversational AI desktop application featuring a real-time 3D avatar, persistent memory, and voice interaction. It runs locally on your machine, giving you full control over your data.

![Aura Preview](assets/aura_preview.png)

## ✨ Features

- 👤 **Interactive 3D Avatar**: Fully animated VRM model that reacts to your words with expressions and gestures.
- 🧠 **Persistent Memory**: Powered by **ChromaDB**, Aura remembers your past interactions, favorite things, and shared stories.
- 🧘 **Emotional Intelligence**: Real-time sentiment analysis maps Aura's expressions (happy, shy, thinking, sad) to the conversation.
- 🎙️ **Voice Interaction**: Speak directly to Aura using high-quality **AI Speech-to-Text (Whisper)** and listen to her respond with expressive **Text-to-Speech**.
- � **Native Integration**: Smooth macOS experience with custom title bars and system notifications.
- �🔒 **Private & Local**: Run your brain locally with **Ollama** (Gemma 3:4b), ensuring your conversations remain on your machine.
- 💻 **Elegant Desktop Experience**: A modern, sleek interface built with **Electron** and **React**.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **Python** (v3.10+)
- **Ollama** installed and running on your system.
- **FFmpeg** (for audio processing).

### 1. Model Setup

Aura uses the `gemma3:4b` model by default. Pull it from Ollama:

```bash
ollama pull gemma3:4b
```

### 2. Installation

Clone the repository and install dependencies:

**Frontend & Desktop:**

```bash
npm install
```

**Backend:**

```bash
pip install -r requirements.txt
```

### 3. Running Aura

Aura requires both the backend and frontend to be running:

1. **Start Backend:**

   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. **Start Frontend & Desktop:**
   ```bash
   # In a new terminal
   npm start
   ```

---

## 🛠️ Tech Stack

- **Frontend**: [React](https://reactjs.org/), [Vite](https://vitejs.dev/), [Three.js](https://threejs.org/), [@pixiv/three-vrm](https://github.com/pixiv/three-vrm)
- **Backend**: [FastAPI](https://fastapi.tiangolo.com/), [Ollama](https://ollama.com/), [ChromaDB](https://www.trychroma.com/)
- **Audio**: [OpenAI Whisper](https://github.com/openai/whisper) (STT), [Coqui TTS](https://github.com/coqui-ai/TTS)
- **Desktop**: [Electron](https://www.electronjs.org/)

---

## 🧩 Project Structure

```bash
├── aura/
│   ├── backend/          # FastAPI server, LLM logic, ChromaDB memory
│   ├── frontend/         # React components, Three.js VRM renderer
│   ├── electron/         # Electron main process & configuration
│   ├── chroma_data/      # Local vector storage for memories
│   └── public/           # Static assets (3D models, icons)
```

---

## 🤝 Contributing

We welcome contributions! Whether it's adding new gestures, optimizing memory retrieval, or improving the UI, feel free to open a Pull Request or Issue.

## 📄 License

This project is licensed under the ISC License.

---

_Made with 💜 by the Aura team._
