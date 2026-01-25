# Intervju-Transkribering

Webbapplikation for transkribering av intervjuer med KB Whisper - optimerad for svenska.

## Projektstruktur

```
intervju-transkribering/
├── backend/          # Python FastAPI
│   ├── app/
│   │   ├── api/v1/   # REST endpoints
│   │   ├── models/   # SQLAlchemy models
│   │   ├── schemas/  # Pydantic schemas
│   │   ├── services/ # Business logic (transcription, diarization)
│   │   └── workers/  # Background job processing
│   └── tests/
└── frontend/         # Next.js + React
    └── src/
        ├── app/      # Pages (App Router)
        ├── components/
        ├── hooks/
        ├── services/ # API client
        └── types/
```

## Kommandon

### Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -e ".[dev]"

# Starta server
uvicorn app.main:app --reload --port 8000

# Tester
pytest -v
ruff check . && ruff format .
mypy app/
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # Starta dev server (port 3000)
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run build        # Production build
```

## API-oversikt

| Endpoint | Beskrivning |
|----------|-------------|
| POST /api/v1/upload | Ladda upp ljudfil |
| POST /api/v1/jobs | Skapa transkriptionsjobb |
| GET /api/v1/jobs | Lista jobb |
| GET /api/v1/jobs/{id} | Hamta jobb med progress |
| GET /api/v1/jobs/{id}/transcript | Hamta transkription |
| GET /api/v1/jobs/{id}/export?format=md | Exportera |

## Viktiga filer

- `backend/app/services/transcription.py` - KB Whisper integration
- `backend/app/services/diarization.py` - WhisperX + pyannote
- `backend/app/workers/transcription_worker.py` - Bakgrundsprocessning
- `frontend/src/components/upload/UploadForm.tsx` - Uppladdningsgranssnitt
- `frontend/src/components/transcription/TranscriptViewer.tsx` - Transkriptvisning

## Databas

SQLite (`transcription.db`) med tva tabeller:
- `jobs` - Transkriptionsjobb med status och progress
- `segments` - Transkriptionssegment med tidsstamplar och talare

## Miljovariabler

Kopiera `backend/.env.example` till `backend/.env`:
- `HF_TOKEN` - HuggingFace token (kravs for talaridentifiering)
- `DEFAULT_MODEL` - Standard KB Whisper-modell

## Utvecklingsflode

1. Starta backend: `uvicorn app.main:app --reload`
2. Starta frontend: `npm run dev`
3. Oppna http://localhost:3000

## Verifiering

Backend: `ruff check . && mypy app/ && pytest`
Frontend: `npm run lint && npm run typecheck`
