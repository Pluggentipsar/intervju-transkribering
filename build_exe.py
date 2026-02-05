#!/usr/bin/env python3
"""
Build TystText as a standalone exe using PyInstaller.

Prerequisites (run once):
    pip install pyinstaller
    cd frontend && npm install && npm run build && cd ..

Usage:
    python build_exe.py

Output:
    dist/TystText/TystText.exe   (+ supporting files)
"""

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
FRONTEND_DIR = ROOT / "frontend"
FRONTEND_OUT = FRONTEND_DIR / "out"
BACKEND_DIR = ROOT / "backend"
SEP = os.pathsep  # Path separator for --add-data (';' on Windows, ':' on Linux/Mac)


def check_prerequisites() -> None:
    """Verify everything needed for the build is in place."""
    errors = []

    try:
        import PyInstaller  # noqa: F401
    except ImportError:
        errors.append("PyInstaller saknas. Installera med: pip install pyinstaller")

    if not (FRONTEND_OUT / "index.html").is_file():
        errors.append(
            "Frontend inte byggd. Kor forst:\n"
            "  cd frontend && npm install && npm run build"
        )

    if not (BACKEND_DIR / "app" / "main.py").is_file():
        errors.append("backend/app/main.py saknas")

    if errors:
        print("FEL - Kan inte bygga:\n")
        for e in errors:
            print(f"  - {e}")
        print()
        sys.exit(1)


def build_frontend() -> None:
    """Build frontend if not already built."""
    if (FRONTEND_OUT / "index.html").is_file():
        print("[OK] Frontend redan byggd.")
        return

    print("[...] Bygger frontend...")
    npm = "npm.cmd" if sys.platform == "win32" else "npm"
    subprocess.run([npm, "install"], cwd=FRONTEND_DIR, check=True)
    subprocess.run([npm, "run", "build"], cwd=FRONTEND_DIR, check=True)
    print("[OK] Frontend byggd.")


def run_pyinstaller() -> None:
    """Run PyInstaller to create the exe."""
    print("[...] Bygger exe med PyInstaller...")

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--name=TystText",
        "--onedir",
        "--console",
        # Tell PyInstaller where to find the 'app' package
        f"--paths={BACKEND_DIR}",
        # Bundle frontend static files
        f"--add-data={FRONTEND_OUT}{SEP}frontend/out",
        # Hidden imports: uvicorn internals (string-based imports)
        "--hidden-import=uvicorn.logging",
        "--hidden-import=uvicorn.protocols",
        "--hidden-import=uvicorn.protocols.http",
        "--hidden-import=uvicorn.protocols.http.auto",
        "--hidden-import=uvicorn.protocols.http.h11_impl",
        "--hidden-import=uvicorn.protocols.http.httptools_impl",
        "--hidden-import=uvicorn.protocols.websockets",
        "--hidden-import=uvicorn.protocols.websockets.auto",
        "--hidden-import=uvicorn.protocols.websockets.wsproto_impl",
        "--hidden-import=uvicorn.protocols.websockets.websockets_impl",
        "--hidden-import=uvicorn.lifespan",
        "--hidden-import=uvicorn.lifespan.on",
        "--hidden-import=uvicorn.lifespan.off",
        # Hidden imports: our app modules (loaded via string in uvicorn.run)
        "--hidden-import=app",
        "--hidden-import=app.main",
        "--hidden-import=app.config",
        "--hidden-import=app.db",
        "--hidden-import=app.db.database",
        "--hidden-import=app.api",
        "--hidden-import=app.api.v1",
        "--hidden-import=app.api.v1.router",
        "--hidden-import=app.api.v1.jobs",
        "--hidden-import=app.api.v1.upload",
        "--hidden-import=app.api.v1.export",
        "--hidden-import=app.api.v1.models",
        "--hidden-import=app.api.v1.anonymize",
        "--hidden-import=app.api.v1.templates",
        "--hidden-import=app.api.v1.editor",
        "--hidden-import=app.models",
        "--hidden-import=app.models.base",
        "--hidden-import=app.models.job",
        "--hidden-import=app.models.segment",
        "--hidden-import=app.schemas",
        "--hidden-import=app.schemas.job",
        "--hidden-import=app.schemas.segment",
        "--hidden-import=app.schemas.upload",
        "--hidden-import=app.services",
        "--hidden-import=app.services.transcription",
        "--hidden-import=app.services.diarization",
        "--hidden-import=app.services.anonymization",
        "--hidden-import=app.workers",
        "--hidden-import=app.workers.transcription_worker",
        # Hidden imports: libraries with dynamic loading
        "--hidden-import=multipart",
        "--hidden-import=aiosqlite",
        "--hidden-import=sqlalchemy.dialects.sqlite",
        "--hidden-import=pydantic_settings",
        # Reduce size: exclude dev/test packages
        "--exclude-module=pytest",
        "--exclude-module=ruff",
        "--exclude-module=mypy",
        "--exclude-module=tkinter",
        "--exclude-module=matplotlib",
        # Output directories
        f"--distpath={ROOT / 'dist'}",
        f"--workpath={ROOT / 'build'}",
        f"--specpath={ROOT}",
        "--clean",
        "--noconfirm",
        # Entry point
        str(ROOT / "launcher.py"),
    ]

    subprocess.run(cmd, check=True)
    print("[OK] Exe byggd!")


def create_data_template() -> None:
    """Create a template data directory with .env instructions."""
    dist_dir = ROOT / "dist" / "TystText"
    data_dir = dist_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    env_file = data_dir / ".env"
    if not env_file.exists():
        env_file.write_text(
            "# TystText - Installningar\n"
            "#\n"
            "# For talaridentifiering (valfritt):\n"
            "# 1. Skapa konto pa https://huggingface.co\n"
            "# 2. Ga till https://huggingface.co/settings/tokens\n"
            "# 3. Skapa en token och klistra in nedan:\n"
            "#\n"
            "# HF_TOKEN=hf_din_token_har\n",
            encoding="utf-8",
        )
    print(f"[OK] Data-mapp skapad: {data_dir}")


def print_summary() -> None:
    """Print build summary."""
    dist_dir = ROOT / "dist" / "TystText"
    exe_name = "TystText.exe" if sys.platform == "win32" else "TystText"

    print()
    print("=" * 50)
    print("  Byggd! Distribution finns i:")
    print(f"  {dist_dir}")
    print()
    print("  For att kora:")
    print(f"  {dist_dir / exe_name}")
    print()
    print("  For att distribuera:")
    print(f"  Zippa hela {dist_dir}-mappen")
    print("=" * 50)


def main() -> None:
    print("=" * 50)
    print("  TystText - Bygg exe")
    print("=" * 50)
    print()

    check_prerequisites()
    build_frontend()
    run_pyinstaller()
    create_data_template()
    print_summary()


if __name__ == "__main__":
    main()
