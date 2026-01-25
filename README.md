# Intervju-Transkribering

Webbapplikation for att transkribera intervjuer med **KB Whisper** - Sveriges basta AI-modell for svenska. Byggt for skoladministratorer som vill transkribera kvalitetsdialoger.

## Funktioner

- **Svensk transkribering** - KB Whisper ar specifikt tranad pa svenska
- **Talaridentifiering** - Automatisk identifiering av olika talare
- **Flera modellstorlekar** - Valj mellan snabb/balanserad/precision
- **Flexibel export** - Text, Markdown, eller JSON
- **Enkelt granssnitt** - Designat for icke-tekniska anvandare

## Forutsattningar

- Python 3.11+
- Node.js 18+
- FFmpeg (for ljudkonvertering)
- Valfritt: NVIDIA GPU med CUDA for snabbare transkribering

## Installation

### 1. Backend

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -e ".[dev]"
```

### 2. Frontend

```bash
cd frontend
npm install
```

### 3. Konfiguration

```bash
cd backend
cp .env.example .env
# Redigera .env och lagg till din HuggingFace token (for talaridentifiering)
```

## Anvandning

### Starta servrar

```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

Oppna http://localhost:3000

### Arbetsflode

1. Ladda upp en ljudfil (MP3, WAV, M4A, etc.)
2. Valj modellstorlek och installningar
3. Vanta pa transkribering (visas med progress)
4. Granska och exportera transkriptionen

## Modeller

| Modell | Beskrivning | Anvandningsfall |
|--------|-------------|-----------------|
| Supersnabb (tiny) | Snabbast, lagre noggrannhet | Snabb genomgang |
| Snabb (base) | Snabb med ok kvalitet | Kortare intervjuer |
| Balanserad (small) | Rekommenderas | De flesta fall |
| Noggrann (medium) | Hog kvalitet | Viktiga intervjuer |
| Precision (large) | Bast kvalitet | Kritiska dokument |

## Talaridentifiering

For att aktivera talaridentifiering:

1. Skapa konto pa [HuggingFace](https://huggingface.co)
2. Acceptera villkoren for:
   - [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1)
   - [pyannote/segmentation-3.0](https://huggingface.co/pyannote/segmentation-3.0)
3. Skapa en [access token](https://huggingface.co/settings/tokens)
4. Lagg till token i `backend/.env`: `HF_TOKEN=hf_xxx...`

## Teknisk stack

- **Backend**: Python, FastAPI, SQLAlchemy, faster-whisper
- **Frontend**: Next.js 14, React 18, TailwindCSS
- **AI**: KB Whisper, WhisperX, pyannote

## Utveckling

```bash
# Backend tester
cd backend
pytest -v

# Backend linting
ruff check . && ruff format .
mypy app/

# Frontend linting
cd frontend
npm run lint
npm run typecheck
```

## Licens

MIT
