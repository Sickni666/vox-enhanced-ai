<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/Vite-8-purple?logo=vite" alt="Vite 8">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss" alt="Tailwind v4">
  <img src="https://img.shields.io/badge/Three.js-r3f-black?logo=three.js" alt="Three.js">
  <img src="https://img.shields.io/badge/React_Bits-29_components-purple" alt="React Bits">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT">
  <br>
  <img src="https://img.shields.io/badge/build-1.33s-success" alt="Build">
  <img src="https://img.shields.io/badge/modules-1066-blue" alt="Modules">
  <img src="https://img.shields.io/badge/bundle-432_kB_gzip-blueviolet" alt="Bundle">
</p>

<br>

<div align="center">
  <h1>🎤 VOX — Enhanced Voice Assistant</h1>
  <p><strong>A production‑ready voice AI assistant with 3D reactive visuals, multi‑provider AI, and 29 integrated React Bits components.</strong></p>
</div>

<br>

## ✨ Features

### 🎙️ Voice Interface
- **Real‑time speech‑to‑text** — OpenAI‑compatible API + Gemini fallback
- **Multi‑provider LLM** — OpenAI / Gemini / any OpenAI‑compatible endpoint
- **Text‑to‑speech** — Edge TTS (free), OpenAI TTS, Gemini TTS, Fish Audio
- **Barge‑in support** — interrupt the assistant while it's speaking
- **Audio visualization** — live frequency bars responding to voice

### 🌐 Vision
- **Image analysis** — drag‑drop or upload images for AI description
- **OpenAI‑compatible vision API** + Gemini Vision fallback

### 🌀 3D Reactive Orb
- **Three.js / @react‑three/fiber** — animated microphone sphere
- **State‑driven colors** — idle (violet) → listening (emerald) → thinking (amber) → speaking (rose)
- **Particle ring** — 300 orbiting particles that pulse with audio
- **Ring visualization** — expanding concentric rings on voice activity
- **Reactive scaling** — orb size responds to volume levels

### 🎨 React Bits Integration (29 components)
| Category | Components |
|----------|-----------|
| **Backgrounds** | Aurora, Beams, DotGrid, Ferrofluid, Grainient, Orb, Particles |
| **Text Animations** | ShinyText, GradientText, TextPressure, BlurText, DecryptedText, CountUp, GlitchText, SplitText |
| **Components** | SpecularButton, BorderGlow, FluidGlass, GlassSurface, SpotlightCard |
| **Animations** | SplashCursor, BlobCursor, MagicRings, PixelTrail, ClickSpark, AnimatedContent, FadeContent |
| **UI** | Dock (coming) |

### ⚙️ Full Settings Panel
- **4‑tab settings** — STT / LLM / TTS / System Prompt
- **Connection testing** — test each provider independently
- **LocalStorage persistence** — settings and conversation history survive reload

### 💬 Conversation Features
- Scrollable chat panel with auto‑scroll
- Message history with localStorage persistence
- System prompt editor
- Toast notifications for errors and events
- Keyboard shortcut support

<br>

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm / yarn / pnpm

### 1. Clone & Install
```bash
git clone https://github.com/Sickni666/vox-enhanced-ai.git
cd vox-enhanced-ai
npm install
```

### 2. Configure
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY (or use custom API providers in the settings panel)
```

### 3. Run (Production Mode)
```bash
NODE_ENV=production npx tsx server.ts
```
Open **http://localhost:3000**

### 4. Run (Dev Mode — separate frontend + API)
```bash
# Terminal 1: API server
npx tsx server.ts

# Terminal 2: Vite dev server  
npx vite
```
Frontend at **http://localhost:5173** (proxy API to port 3000)

<br>

## 🏗️ Architecture

```
vox-assistant-enhanced/
├── src/
│   ├── components/
│   │   ├── VoiceOrb.tsx          # 3D reactive microphone sphere (Three.js)
│   │   ├── ConversationPanel.tsx  # Chat messages with auto-scroll
│   │   ├── SettingsModal.tsx      # 4-tab settings (STT/LLM/TTS/Prompt)
│   │   ├── VisionModal.tsx        # Drag-drop image analysis
│   │   ├── SystemPromptPanel.tsx  # System prompt editor
│   │   ├── ToastContainer.tsx     # Toast notifications
│   │   ├── AudioViz.tsx           # Frequency bar visualization
│   │   └── reactbits/            # 29 React Bits components
│   ├── services/
│   │   ├── audioService.ts       # Web Audio API recording & playback
│   │   ├── sttService.ts         # Speech-to-text client
│   │   ├── llmService.ts         # LLM chat client
│   │   ├── ttsService.ts         # Text-to-speech client
│   │   ├── visionService.ts      # Image analysis client
│   │   └── settingsService.ts    # LocalStorage persistence
│   ├── store/useVoiceStore.ts    # Zustand state machine
│   ├── types/index.ts            # Full TypeScript types
│   ├── App.tsx                   # Main integration
│   ├── main.tsx                  # React entry
│   └── index.css                 # Tailwind v4 + theme
├── server.ts                     # Express + API endpoints + Vite middleware
├── vite.config.ts                # Tailwind v4 + React + path alias
├── tsconfig.json                 # Strict TypeScript
└── package.json
```

<br>

## 📡 API Endpoints (port 3000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server health check |
| `/api/stt` | POST | Speech‑to‑text (audio file → text) |
| `/api/llm` | POST | LLM chat completion |
| `/api/tts` | POST | Text‑to‑speech (text → audio) |
| `/api/vision` | POST | Image analysis (image → description) |
| `/api/test-stt` | POST | Test STT configuration |
| `/api/test-llm` | POST | Test LLM configuration |
| `/api/test-tts` | POST | Test TTS configuration |

<br>

## 🧪 Build Verification

```bash
# TypeScript check
npx tsc --noEmit    # → 0 errors

# Production build
npx vite build       # → 1.33s, 1066 modules

# Output
dist/
├── index.html                   0.69 kB
├── assets/index.css            38.32 kB
└── assets/index.js          1,487.07 kB  (432 kB gzipped)
```

<br>

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 |
| **Build** | Vite 8 |
| **Language** | TypeScript (strict) |
| **Styling** | Tailwind CSS v4 |
| **3D** | Three.js / @react-three/fiber / @react-three/drei |
| **State** | Zustand |
| **Animation** | Motion (React), GSAP |
| **UI Effects** | React Bits (29 components) |
| **Backend** | Express 5 |
| **AI Providers** | OpenAI‑compatible, Gemini, Edge TTS, Fish Audio |
| **Audio** | Web Audio API (MediaRecorder, AnalyserNode) |

<br>

## 📄 License

MIT — free to use, modify, and distribute.

<br>

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/Sickni666">Sickni666</a></p>
  <p>
    <a href="https://github.com/Sickni666/vox-enhanced-ai/issues">Report Bug</a> ·
    <a href="https://github.com/Sickni666/vox-enhanced-ai/discussions">Feature Request</a>
  </p>
</div>
