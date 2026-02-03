# Startguide - Intervju-Transkribering

## Krav
- Python 3.11
- Node.js

## Starta Backend (Terminal 1)

```powershell
cd backend
.\venv_py311\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

Backend körs på: http://localhost:8000

## Starta Frontend (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Frontend körs på: http://localhost:3000

## Snabbstart (om venv redan finns)

### Backend
```powershell
cd backend
.\venv_py311\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```
