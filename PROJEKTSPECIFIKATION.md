# TystText - Projektspecifikation

## Innehall

1. [Syfte och vision](#syfte-och-vision)
2. [Tjanstebeskrivning](#tjanstebeskrivning)
3. [Malgrupp och anvandningsfall](#malgrupp-och-anvandningsfall)
4. [Funktionsoversikt](#funktionsoversikt)
5. [Teknisk arkitektur](#teknisk-arkitektur)
6. [Databasdesign](#databasdesign)
7. [API-specifikation](#api-specifikation)
8. [Frontend-arkitektur](#frontend-arkitektur)
9. [ML-pipeline](#ml-pipeline)
10. [Driftsattning](#driftsattning)
11. [Beroenden och tredjepartsbibliotek](#beroenden-och-tredjepartsbibliotek)
12. [Kanda problem och laroprocesser](#kanda-problem-och-laroprocesser)

---

## Syfte och vision

### Problemet

Forskare, journalister och myndigheter genomfor intervjuer som behover transkriberas. Befintliga verktyg ar antingen:

- **Molnbaserade** (Otter.ai, Google Speech-to-Text) - problematiskt for kansligt material som intervjuer med patienter, brottsoffer eller andra skyddsvarda personuppgifter
- **Generellt engelska** - darlig kvalitet pa svenska, sarskilt med dialekter och facktermer
- **Dyra** - kommersiella transkriptionstjanster kostar tusentals kronor per timme

### Losningen

**TystText** ar en lokal transkriptionsapplikation optimerad for svenska. All processning sker pa anvandarens egen dator - ingen data lamnar maskinen. Applikationen anvander KBLabs svenska Whisper-modeller som ar topprestanda for svensk talatigenkanning.

### Vision

En komplett arbetsstation for intervjubearbetning: transkribera, identifiera talare, anonymisera kansliga uppgifter, redigera pa ordniva - allt lokalt och gratis.

---

## Tjanstebeskrivning

TystText ar en webbaserad skrivbordsapplikation som:

1. **Transkriberar ljudfiler till text** med hog precision pa svenska (KBLab/kb-whisper)
2. **Identifierar talare** - separerar "Intervjuare" fran "Respondent" automatiskt (WhisperX + pyannote)
3. **Anonymiserar kansligt innehall** i tva steg:
   - AI-baserat (KB-BERT NER): hittar namn, platser, organisationer automatiskt
   - Monsterbaserat: personnummer, telefonnummer, e-post, institutionsnamn
4. **Exporterar** i flera format: ren text, Markdown, JSON, SRT/VTT (undertexter)
5. **Redigerar ljud pa ordniva** - markera ord for bortklippning, generera redigerad ljudfil med ffmpeg
6. **Kor helt lokalt** - ingen internetanslutning kravs efter installation (forutom forsta nedladdning av ML-modeller)

### Tva driftslagon

| Lage | Beskrivning | Anvandning |
|------|-------------|------------|
| **Lokal exe** | Fristaaende Windows-applikation (PyInstaller) | Slutanvandare, kansligt material |
| **Webblage** | Next.js dev-server + FastAPI backend | Utveckling, team-driftsattning |

---

## Malgrupp och anvandningsfall

### Primart

- **Forskare** som transkriberar forskningsintervjuer och behover anonymisera informanter
- **Journalister** som behover snabb, saker transkription av intervjuer och samtal
- **Myndigheter** som hanterar kansliga forhorsprotokoll, patientsamtal, medborgardialoger

### Sekundart

- **Studenter** som transkriberar intervjuer for uppsatser
- **Foretag** som behover motesprotokoll pa svenska
- **Tillganglighet** - undertexter (SRT/VTT-export) for videoproduktion

### Typiskt arbetsflode

```
1. Anvandaren drar in en ljudfil (.mp3, .wav, .m4a, .ogg, .flac, .webm)
2. Valjer modellstorlek (tiny→large beroende pa dator och kvalitetskrav)
3. Aktiverar valfritt: talaridentifiering, anonymisering
4. Vantar pa processning (visar progress i realtid)
5. Granskar transkription med ljudspelare synkroniserad till text
6. Redigerar vid behov: andrar text, byter talarnamn, anonymiserar ytterligare
7. Exporterar till onskat format
```

---

## Funktionsoversikt

### Karnfunktioner

| Funktion | Beskrivning | Status |
|----------|-------------|--------|
| Transkription | KB-Whisper tal-till-text (5 modellstorlekar) | Klar |
| Talaridentifiering | WhisperX + pyannote diarization | Klar |
| NER-anonymisering | KB-BERT for namn, platser, organisationer | Klar |
| Monsteranonymisering | Regex for personnummer, telefonnummer, e-post mm | Klar |
| Exportering | TXT, MD, JSON, SRT, VTT, PDF | Klar |
| Jobbhantering | Skapa, lista, ta bort, sok bland transkriptioner | Klar |
| Ljuduppspelning | Synkroniserad med transkriptionstext | Klar |
| Talarhantering | Byt namn pa talare, talarstatistik | Klar |

### Utokade funktioner

| Funktion | Beskrivning | Status |
|----------|-------------|--------|
| Ljudredigering | Ordniva-redigering, generera klippt ljud via ffmpeg | Klar |
| Ordmallar | Sparade ord/fraserersattningar for upprepade monster | Klar |
| Global sokning | Fritext-sokning over alla transkriptioner | Klar |
| Fristaaende anonymisering | Anonymisera godtycklig text (utan transkription) | Klar |
| Batchuppladdning | Ladda upp flera filer samtidigt | Klar |
| Ljudinspelning | Spela in direkt i appen | Klar |
| Installningshantering | Konfigurera HuggingFace-token via UI | Klar |

---

## Teknisk arkitektur

### Oversikt

```
┌─────────────────────────────────────────────────┐
│                   TystText                       │
│                                                  │
│  ┌──────────────┐         ┌──────────────────┐  │
│  │   Frontend    │  HTTP   │    Backend        │  │
│  │   Next.js     │◄──────►│    FastAPI         │  │
│  │   React 18    │        │    Python 3.11+    │  │
│  │   TypeScript  │        │                    │  │
│  │   Tailwind    │        │  ┌──────────────┐  │  │
│  └──────────────┘         │  │   Services   │  │  │
│                            │  │              │  │  │
│                            │  │ Transcription│  │  │
│                            │  │ Diarization  │  │  │
│                            │  │ Anonymization│  │  │
│                            │  └──────┬───────┘  │  │
│                            │         │          │  │
│                            │  ┌──────▼───────┐  │  │
│                            │  │   ML Models  │  │  │
│                            │  │              │  │  │
│                            │  │ KB-Whisper   │  │  │
│                            │  │ WhisperX     │  │  │
│                            │  │ KB-BERT      │  │  │
│                            │  └──────────────┘  │  │
│                            │                    │  │
│                            │  ┌──────────────┐  │  │
│                            │  │   SQLite DB  │  │  │
│                            │  │              │  │  │
│                            │  │ jobs         │  │  │
│                            │  │ segments     │  │  │
│                            │  │ words        │  │  │
│                            │  │ templates    │  │  │
│                            │  └──────────────┘  │  │
│                            └──────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Backend (Python FastAPI)

```
backend/
├── app/
│   ├── main.py              # FastAPI-app, CORS, statisk filservering
│   ├── config.py            # Pydantic Settings, miljovariabler
│   ├── db/
│   │   └── database.py      # Async SQLAlchemy + aiosqlite
│   ├── models/              # SQLAlchemy ORM-modeller
│   │   ├── base.py          # Deklarativ basklass
│   │   ├── job.py           # Transkriptionsjobb
│   │   ├── segment.py       # Textsegment med tidsstamplar
│   │   ├── word.py          # Ordniva-tidsstamplar
│   │   └── template.py      # Ordersattningsmallar
│   ├── schemas/             # Pydantic request/response-modeller
│   │   ├── job.py           # JobCreate, JobResponse, JobStatus
│   │   ├── segment.py       # SegmentResponse, TranscriptResponse, mm
│   │   └── upload.py        # UploadResponse
│   ├── services/            # Affarslogik och ML-integration
│   │   ├── transcription.py # faster-whisper / KB-Whisper
│   │   ├── diarization.py   # WhisperX + pyannote
│   │   └── anonymization.py # KB-BERT NER + regex-monster
│   ├── workers/
│   │   └── transcription_worker.py  # Bakgrundsprocessning i tradpool
│   └── api/v1/              # REST-endpoints
│       ├── router.py        # Aggregerad router
│       ├── upload.py        # Filuppladdning
│       ├── jobs.py          # CRUD for jobb + transkription
│       ├── export.py        # Export + ljudstromning
│       ├── editor.py        # Ordniva-redigering + ffmpeg
│       ├── anonymize.py     # Fristaaende anonymisering
│       ├── models.py        # Modellinfo + GPU-detektion
│       ├── templates.py     # Ordmallar CRUD
│       └── settings.py      # HuggingFace-token
└── pyproject.toml           # Beroenden, verktygsconfig
```

### Frontend (Next.js + React)

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Rotlayout, QueryClientProvider
│   │   ├── page.tsx         # Startsida (dashboard eller landningssida)
│   │   ├── upload/page.tsx  # Uppladdningsformuler
│   │   ├── jobs/
│   │   │   ├── page.tsx     # Jobblista
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Jobbdetalj + transkriptvisning
│   │   │       └── edit/page.tsx # Ljudredigering
│   │   └── anonymize/page.tsx    # Fristaaende anonymisering
│   ├── components/
│   │   ├── layout/          # Header
│   │   ├── upload/          # UploadForm, FileDropzone, AudioRecorder, ModelSelector
│   │   ├── transcription/   # TranscriptViewer, AudioPlayer, SpeakerManager mm
│   │   ├── editor/          # AudioWaveform
│   │   ├── hero/            # Landningssida-komponenter
│   │   └── ui/              # Button, ProgressBar
│   ├── hooks/
│   │   └── usePolling.ts    # Statuspolling for aktiva jobb
│   ├── services/
│   │   └── api.ts           # Axios API-klient
│   ├── types/
│   │   └── index.ts         # TypeScript-interfacen (matchar backend-scheman)
│   └── utils/
│       └── pdfExport.ts     # PDF-generering med jsPDF
├── package.json
├── next.config.js           # Villkorlig config (lokal/webb)
├── tailwind.config.ts       # Temat (teal + mork design)
└── tsconfig.json
```

### Kommunikationsflode

```
Frontend                      Backend                        ML/Disk
   │                            │                              │
   │── POST /upload ──────────►│── Spara fil ────────────────►│
   │◄── UploadResponse ────────│                              │
   │                            │                              │
   │── POST /jobs ────────────►│── Skapa jobb (PENDING) ─────►│ DB
   │◄── JobResponse ───────────│── Koa bakgrundstask          │
   │                            │                              │
   │── GET /jobs/{id} (poll) ──►│                              │
   │◄── progress: 35% ─────────│                              │
   │                            │   [Bakgrundstrad]            │
   │                            │── faster-whisper ───────────►│ GPU/CPU
   │                            │◄── Segment[] ────────────────│
   │                            │── whisperx diarization ─────►│ GPU/CPU
   │                            │◄── Talarlabels ──────────────│
   │                            │── KB-BERT NER ──────────────►│ GPU/CPU
   │                            │◄── Anonymiserad text ────────│
   │                            │── Spara segment ────────────►│ DB
   │                            │                              │
   │── GET /jobs/{id} (poll) ──►│                              │
   │◄── status: completed ─────│                              │
   │                            │                              │
   │── GET /transcript ───────►│── Hamta segment ────────────►│ DB
   │◄── TranscriptResponse ────│◄── Segment[] ────────────────│
```

---

## Databasdesign

### ERD

```
┌──────────────────────┐
│        jobs           │
├──────────────────────┤
│ id          UUID PK  │
│ name        TEXT     │
│ file_name   TEXT     │
│ file_path   TEXT     │
│ file_size   INT      │
│ duration_seconds REAL│
│ model       TEXT     │
│ language    TEXT     │
│ enable_diarization  BOOL│
│ enable_anonymization BOOL│
│ ner_entity_types TEXT│
│ status      TEXT     │──── PENDING | PROCESSING | COMPLETED | FAILED | CANCELLED
│ progress    INT      │──── 0-100
│ current_step TEXT    │
│ error_message TEXT   │
│ speaker_count INT    │
│ word_count   INT     │
│ segment_count INT    │
│ created_at  DATETIME │
│ started_at  DATETIME │
│ completed_at DATETIME│
└──────────┬───────────┘
           │ 1:N
┌──────────▼───────────┐
│      segments         │
├──────────────────────┤
│ id          INT PK   │
│ job_id      UUID FK  │
│ segment_index INT    │
│ start_time  REAL     │──── sekunder
│ end_time    REAL     │
│ text        TEXT     │──── Originaltext
│ anonymized_text TEXT │──── NER-anonymiserad text
│ speaker     TEXT     │──── "Talare 1", "Talare 2"
│ confidence  REAL     │
└──────────┬───────────┘
           │ 1:N
┌──────────▼───────────┐
│        words          │
├──────────────────────┤
│ id          INT PK   │
│ segment_id  INT FK   │
│ word_index  INT      │
│ start_time  REAL     │──── sekunder
│ end_time    REAL     │
│ text        TEXT     │
│ confidence  REAL     │
│ included    BOOL     │──── For ljudredigering
└──────────────────────┘

┌──────────────────────┐
│    word_templates     │
├──────────────────────┤
│ id          UUID PK  │
│ name        TEXT     │
│ description TEXT     │
│ words_json  TEXT     │──── JSON: [{word, replacement}]
│ created_at  DATETIME │
│ updated_at  DATETIME │
└──────────────────────┘
```

### Motor

**SQLite** via `aiosqlite` (asynkron driver) och **SQLAlchemy 2.0** (async mode).

Valet av SQLite ar medvetet - applikationen ar designad for enkel installation utan extern databasserver. Databasen (`transcription.db`) lagras bredvid applikationen.

---

## API-specifikation

### Uppladdning

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| POST | `/api/v1/upload` | Ladda upp ljudfil (multipart/form-data) |
| DELETE | `/api/v1/upload/{file_id}` | Ta bort uppladdad fil |

**Stodda format:** .mp3, .wav, .m4a, .ogg, .flac, .webm
**Max storlek:** 2 GB (konfigurerbart)

### Jobb

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| POST | `/api/v1/jobs` | Skapa transkriptionsjobb |
| GET | `/api/v1/jobs` | Lista jobb (paginerat, nyast forst) |
| GET | `/api/v1/jobs/{id}` | Hamta jobb med progress |
| PATCH | `/api/v1/jobs/{id}` | Uppdatera jobbnamn |
| DELETE | `/api/v1/jobs/{id}` | Ta bort jobb och tillhorande filer |

### Transkription

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/v1/jobs/{id}/transcript` | Hamta transkription med segment |
| PATCH | `/api/v1/jobs/{id}/segments/{seg_id}` | Redigera segmenttext/talare |
| POST | `/api/v1/jobs/{id}/rename-speaker` | Byt talarnamn over alla segment |
| POST | `/api/v1/jobs/{id}/enhance-anonymization` | Kor monsteranonymisering |
| POST | `/api/v1/jobs/{id}/run-anonymization` | Kor NER-anonymisering retroaktivt |

### Export

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/v1/jobs/{id}/export?format=txt\|md\|json\|srt\|vtt` | Exportera transkription |
| GET | `/api/v1/jobs/{id}/audio` | Stromma originalljudfil |

### Ljudredigering

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/v1/editor/{id}/editable-transcript` | Hamta ordniva-data |
| POST | `/api/v1/editor/{id}/words/edit` | Markera ord inkluderade/exkluderade |
| GET | `/api/v1/editor/{id}/download-edited-audio` | Ladda ner redigerad ljudfil |
| POST | `/api/v1/editor/{id}/reset-edits` | Aterstall alla redigeringar |

### Anonymisering (fristaaende)

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| POST | `/api/v1/anonymize` | Anonymisera godtycklig text |
| GET | `/api/v1/anonymize/status` | Kolla NER-tillganglighet |

### Modeller och system

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/v1/models` | Lista tillgangliga KB-Whisper-modeller |
| GET | `/api/v1/models/system` | GPU-detektion, rekommenderade installningar |

### Installningar

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/v1/settings/hf-token` | Kontrollera HF-token status |
| POST | `/api/v1/settings/hf-token` | Spara HuggingFace-token |
| DELETE | `/api/v1/settings/hf-token` | Ta bort HF-token |

### Mallar och sokning

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/v1/templates` | Lista ordmallar |
| POST | `/api/v1/templates` | Skapa ordmall |
| PATCH | `/api/v1/templates/{id}` | Uppdatera ordmall |
| DELETE | `/api/v1/templates/{id}` | Ta bort ordmall |
| GET | `/api/v1/search/global?q=...` | Sok i alla transkriptioner |

---

## Frontend-arkitektur

### Design

- **Fargschema:** Teal (primarfarg) + mork bakgrund (dark-950). Professionellt, lugnt uttryck.
- **Typografi:** Monospace-vanligt, latt att lasa transkriptioner.
- **Responsivt:** Fungerar pa desktop (primart) och mobil.

### Sidstruktur

| Sida | Route | Beskrivning |
|------|-------|-------------|
| Startsida | `/` | Dashboard (lokalt) eller landningssida (webb) |
| Uppladdning | `/upload` | Dra-och-slapp filuppladdning, modelval, installningar |
| Jobblista | `/jobs` | Alla transkriptionsjobb med status |
| Jobbdetalj | `/jobs/[id]` | Transkriptvisning, ljudspelare, export |
| Ljudredigering | `/jobs/[id]/edit` | Ordniva-redigering med vagformsvisning |
| Anonymisering | `/anonymize` | Fristaaende textanonymisering |

### Nyckelkomponenter

- **UploadForm / FileDropzone** - Dra-och-slapp med react-dropzone, filvalidering
- **ModelSelector** - Valj KB-Whisper-modell med storlek/kvalitetsinformation
- **TranscriptViewer** - Visar segment med tidsstamplar, talare, anonymiserad text
- **AudioPlayer** - Synkroniserad uppspelning mot transkriptionstext
- **SpeakerManager** - Hantera och byt namn pa identifierade talare
- **EnhancedAnonymization** - Monsteranonymisering med forhandsgranskning
- **AudioWaveform** - Vagformsvisualisering for ljudredigering
- **GlobalSearch** - Sok over alla transkriptioner

### State Management

- **TanStack Query (React Query)** for servertillstand (caching, polling, invalidering)
- **usePolling** hook - pollar jobbstatus var 2:a sekund under processning
- Inga tunga state-bibliotek (Redux/Zustand) - React Query racker

---

## ML-pipeline

### 1. Transkription (faster-whisper + KB-Whisper)

```
Ljudfil (.mp3/.wav/...)
    │
    ▼
faster-whisper (CTranslate2-optimerad)
    │
    ├── Modell: KBLab/kb-whisper-{tiny|base|small|medium|large}
    ├── Sprak: svenska (sv) eller auto-detect
    ├── Ordniva-tidsstamplar: aktiverat
    └── Enhet: CUDA (GPU) eller CPU
    │
    ▼
TranscriptionResult
    ├── segments[]: {start, end, text, words[]}
    ├── language: "sv"
    └── duration: float (sekunder)
```

**Modellstorlekar:**

| Modell | Storlek | Precision | Hastighet |
|--------|---------|-----------|-----------|
| tiny | ~150 MB | Lagre | Mycket snabb |
| base | ~290 MB | Ok | Snabb |
| small | ~970 MB | Bra (rekommenderas) | Medel |
| medium | ~3 GB | Mycket bra | Langsam |
| large | ~6 GB | Bast | Mycket langsam |

### 2. Talaridentifiering (WhisperX + pyannote)

```
TranscriptionResult + Originalljud
    │
    ▼
WhisperX
    ├── DiarizationPipeline (pyannote.audio)
    │   └── Kraver HuggingFace-token (pyannote ar gated)
    ├── Laddar ljud: whisperx.load_audio()
    ├── Kor diarization: pipeline(audio)
    └── assign_word_speakers(): mappar talare → segment
    │
    ▼
Segment[] med speaker-labels
    └── "SPEAKER_00" → "Talare 1", "SPEAKER_01" → "Talare 2"
```

### 3. Anonymisering

#### Steg 1: NER (KB-BERT)

```
Segmenttext
    │
    ▼
KB-BERT NER-pipeline (Hugging Face transformers)
    │
    ├── Entitetstyper:
    │   ├── PER/PRS → [PERSON 1], [PERSON 2] (raknar unikt)
    │   ├── LOC → [PLATS]
    │   ├── ORG → [ORGANISATION]
    │   ├── TME → [DATUM]
    │   └── EVN → [HANDELSE]
    │
    ├── Konfidenströskel: 0.7
    └── Personrakare: haller reda pa unika personer over segment
    │
    ▼
anonymized_text per segment
```

#### Steg 2: Monsteranonymisering (regex)

```
Text (original eller NER-anonymiserad)
    │
    ▼
Regex-monster:
    ├── Personnummer: YYYYMMDD-XXXX → [PERSONNUMMER]
    ├── Telefonnummer: 07X-XXX XX XX → [TELEFONNUMMER]
    ├── E-post: user@domain.se → [E-POST]
    ├── Postnummer: XXX XX → [POSTNUMMER]
    ├── Datum: YYYY-MM-DD → [DATUM]
    ├── URL:er: https://... → [URL]
    ├── Registreringsnummer: ABC 123 → [REGNUMMER]
    └── Institutioner: "pa gymnasiet" → "pa [INSTITUTION]"
    │
    ▼
enhanced_anonymized_text per segment
```

### Processningspipeline (bakgrundstrad)

```
Steg           Progress    Beskrivning
────────────── ────────── ────────────────────────
Koat           0-5%        Vantar pa processning
Transkription  5-70%       faster-whisper arbetar
Diarization    70-90%      WhisperX tilldelar talare
Anonymisering  90-95%      KB-BERT + regex
Sparar         95-100%     Segment → databas
```

Kor i en **tradpoolexekutor** (max 2 samtida jobb) med 30 minuters timeout.

---

## Driftsattning

### Alternativ 1: Lokal exe (PyInstaller)

```
dist/TystText/
├── TystText.exe          # Startbar applikation
├── _internal/            # Python-runtime + beroenden
├── frontend/out/         # Statisk Next.js-build
└── data/                 # Skapas vid forsta korning
    ├── uploads/          # Uppladdade ljudfiler
    ├── models/           # Nedladdade ML-modeller
    ├── transcription.db  # SQLite-databas
    └── .env              # Konfiguration
```

**Byggprocess:**
1. `cd frontend && npm run build` (skapar `out/` med statisk HTML)
2. PyInstaller paketerar `launcher.py` + `backend/` + `frontend/out/`
3. `launcher.py` startar uvicorn pa port 8080 och oppnar webblasaren

### Alternativ 2: Utvecklingsserver

```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev   # Port 3000, proxar API till 8000
```

### Alternativ 3: Webbdriftsattning

Frontend bygger med `output: "export"` for statisk hosting (Vercel, Netlify).
Backend driftsatts som vanlig FastAPI-app med en ASGI-server.

---

## Beroenden och tredjepartsbibliotek

### Backend (Python)

| Paket | Version | Syfte |
|-------|---------|-------|
| fastapi | - | Webb-ramverk |
| uvicorn | - | ASGI-server |
| pydantic / pydantic-settings | - | Datavalidering, konfiguration |
| sqlalchemy | 2.0+ | ORM (async) |
| aiosqlite | - | Asynkron SQLite-driver |
| faster-whisper | - | CTranslate2-optimerad Whisper |
| python-multipart | - | Filuppladdning |
| aiofiles | - | Asynkron fil-I/O |
| python-dotenv | - | Miljovariabler fran .env |
| huggingface-hub | - | Modellnedladdning |

**Valfria beroenden:**

| Paket | Syfte |
|-------|-------|
| whisperx | Talaridentifiering |
| pyannote.audio | Diarization-modell |
| transformers + torch | KB-BERT NER-anonymisering |

### Frontend (Node.js)

| Paket | Version | Syfte |
|-------|---------|-------|
| next | 14.1.0 | React-ramverk |
| react | 18.2.0 | UI-bibliotek |
| @tanstack/react-query | 5.17.0 | Servertillstand, caching, polling |
| axios | 1.6.0 | HTTP-klient |
| tailwindcss | 3.4.0 | Utility-first CSS |
| lucide-react | 0.309.0 | Ikonbibliotek |
| react-dropzone | 14.2.3 | Dra-och-slapp filuppladdning |
| jspdf | 4.1.0 | PDF-generering |
| date-fns | 3.2.0 | Datumformatering |
| tailwind-merge | 2.2.0 | Tailwind-klasshantering |

### Systemkrav

- **Python** >= 3.11
- **Node.js** >= 18 (for frontend-build)
- **ffmpeg** (for ljudredigering)
- **CUDA** (valfritt, for GPU-acceleration)

---

## Kanda problem och laroprocesser

### Saker att tanka pa vid ombyggnad

1. **PyInstaller-bygget** - De tunga `--collect-all`-flaggorna for whisperx, torch, pyannote gorde bygget extremt langsamt (10+ minuter) och skapade enorma exe-filer. Anvand `--hidden-import` istallet och lista bara de moduler som faktiskt behovs.

2. **PyTorch 2.6+ kompatibilitet** - `torch.load()` andrade default for `weights_only` till `True`, vilket bryter pyannote. Kraver monkey-patching i main.py och transcription_worker.py.

3. **Statisk vs dynamisk frontend** - Next.js `output: "export"` kraver noggrann hantering av dynamiska routes (t.ex. `/jobs/[id]`). Backend behover mappa rutter manuellt for att servera ratt HTML-filer.

4. **Asynkron SQLite** - `aiosqlite` fungerar bra men kraver `AsyncSession` och `async with`-pattern genomgaaende. Blanda inte synkron och asynkron databasaccess.

5. **Modellcachning** - ML-modeller tar lang tid att ladda. Cachning ar kritiskt for andrahandsanvandning. Men man maste ha `clear_model_cache()` for att frigora GPU-minne.

6. **HuggingFace gated models** - pyannote-modeller kraver accepterad licens pa HuggingFace + token. Felmeddelanden ar kryptiska om token saknas.

7. **CORS** - Behövs bara i utvecklingslage (frontend pa port 3000, backend pa 8000). I produktion servas allt fran samma server.

8. **Progressrapportering** - Anvand en tradsakerko (queue.Queue) for att kommunicera progress fran bakgrundstraden till den asynkrona huvudtraden.

---

## Sammanfattning

TystText ar en **lokal, svensk, AI-driven transkriptionsapplikation** som kombinerar:

- **KBLabs svenska Whisper-modeller** for toppkvalitet pa svensk taligenkanning
- **Talaridentifiering** for att separera intervjuare och respondenter
- **Tvastegad anonymisering** (AI + monster) for kansligt material
- **Ordniva-ljudredigering** for precis klippning
- **Fristaaende distribution** som Windows-exe utan installationskrav

Arkitekturen ar medvetet enkel: FastAPI + SQLite + Next.js. Ingen extern databas, inget kohanteringssystem, inga mikrotjanster. Allt kor pa en maskin, allt data stannar lokalt.
