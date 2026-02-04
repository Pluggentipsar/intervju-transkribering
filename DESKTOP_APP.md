# TystText Desktop App

En desktop-version av TystText som kör helt lokalt på din dator.

## Fördelar med Desktop-versionen

- **Dubbelklicka och kör** - Inga terminaler eller kommandon
- **100% offline** - Fungerar utan internet (efter första nedladdningen)
- **All data stannar lokalt** - Inget skickas till molnet
- **Automatiska uppdateringar** - (kan byggas in)

## Förkunskapskrav för att BYGGA appen

> **OBS:** Dessa krav gäller endast för utvecklare som vill bygga appen.
> Slutanvändare behöver bara ladda ner den färdiga `.exe`-filen.

### 1. Rust

Rust behövs för att kompilera Tauri-appen.

**Windows:**
1. Ladda ner: https://rustup.rs/
2. Kör `rustup-init.exe`
3. Välj "1" för standardinstallation
4. Starta om terminalen

**Verifiera:**
```bash
rustc --version
# Bör visa: rustc 1.xx.x
```

### 2. Node.js (redan installerat om du kört web-versionen)

```bash
node --version
# Bör visa: v18.x eller högre
```

### 3. Python med backend-beroenden (redan installerat)

```bash
cd backend
pip install pyinstaller
```

## Bygga Desktop-appen

### Steg 1: Bygg Python-backend som exe

```bash
cd frontend
npm run tauri:build-backend
```

Detta skapar `tysttext-backend.exe` i `frontend/src-tauri/binaries/`.

### Steg 2: Bygg Tauri-appen

```bash
cd frontend
npm run tauri:build
```

### Resultat

Efter bygget finns installationsfilen i:
- Windows: `frontend/src-tauri/target/release/bundle/msi/TystText_1.0.0_x64_en-US.msi`
- Eller: `frontend/src-tauri/target/release/bundle/nsis/TystText_1.0.0_x64-setup.exe`

## Utvecklingsläge

För att köra appen under utveckling:

```bash
# Terminal 1: Starta Python-backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Starta Tauri-appen
cd frontend
npm run tauri:dev
```

## Arkitektur

```
┌─────────────────────────────────────────┐
│           TystText Desktop App          │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │     Tauri Window (WebView2)       │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │      Next.js Frontend       │  │  │
│  │  │      (React + TypeScript)   │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│                    │                    │
│                    │ HTTP (localhost)   │
│                    ▼                    │
│  ┌───────────────────────────────────┐  │
│  │    Python Backend (Sidecar)       │  │
│  │  ┌─────────────┐ ┌─────────────┐  │  │
│  │  │ KB Whisper  │ │  WhisperX   │  │  │
│  │  │ (Swedish)   │ │ (Diarize)   │  │  │
│  │  └─────────────┘ └─────────────┘  │  │
│  │  ┌─────────────┐ ┌─────────────┐  │  │
│  │  │  KB-BERT    │ │   SQLite    │  │  │
│  │  │  (NER)      │ │   (Data)    │  │  │
│  │  └─────────────┘ └─────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Felsökning

### "Rust not found"
Installera Rust från https://rustup.rs/ och starta om terminalen.

### "PyInstaller failed"
```bash
cd backend
pip install --upgrade pyinstaller
```

### Backend startar inte
Kontrollera att port 8000 är ledig:
```bash
netstat -ano | findstr :8000
```

### Stora ML-modeller
Första körningen laddar ner AI-modeller (~500 MB - 3 GB).
Modellerna sparas lokalt och återanvänds vid framtida körningar.
