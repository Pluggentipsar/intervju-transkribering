#!/usr/bin/env python3
"""Start TystText locally - builds frontend and launches the server."""

import subprocess
import sys
import webbrowser
from pathlib import Path
from time import sleep

ROOT = Path(__file__).parent
FRONTEND_DIR = ROOT / "frontend"
BACKEND_DIR = ROOT / "backend"
STATIC_DIR = FRONTEND_DIR / "out"


def run(cmd: list[str], cwd: Path) -> None:
    """Run a command and exit on failure."""
    print(f"  > {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd)
    if result.returncode != 0:
        print(f"Kommandot misslyckades med kod {result.returncode}")
        sys.exit(1)


def build_frontend() -> None:
    """Build the Next.js frontend as static files for local app mode."""
    if STATIC_DIR.is_dir() and (STATIC_DIR / "index.html").is_file():
        print("[OK] Frontend redan byggd. Ta bort frontend/out/ for att bygga om.")
        return

    print("[...] Bygger frontend (lokal app-lage)...")
    npm = "npm.cmd" if sys.platform == "win32" else "npm"
    import os
    env = {**os.environ, "BUILD_MODE": "local", "NEXT_PUBLIC_APP_MODE": "local"}
    run([npm, "install"], cwd=FRONTEND_DIR)

    print(f"  > {npm} run build")
    result = subprocess.run([npm, "run", "build"], cwd=FRONTEND_DIR, env=env)
    if result.returncode != 0:
        print(f"Kommandot misslyckades med kod {result.returncode}")
        sys.exit(1)

    print("[OK] Frontend byggd.")


def start_server() -> None:
    """Start the FastAPI backend server."""
    print("[...] Startar server pa http://localhost:8000")
    print("      Tryck Ctrl+C for att avsluta.\n")

    # Open browser once the server is actually responding
    def open_browser() -> None:
        import urllib.request
        import urllib.error
        for _ in range(30):
            try:
                urllib.request.urlopen("http://localhost:8000/health", timeout=2)
                break
            except (urllib.error.URLError, OSError):
                sleep(1)
        webbrowser.open("http://localhost:8000")

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    subprocess.run(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR,
    )


def main() -> None:
    print("=" * 50)
    print("  TystText - Lokal transkribering")
    print("=" * 50)
    print()

    build_frontend()
    print()
    start_server()


if __name__ == "__main__":
    main()
