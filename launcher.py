#!/usr/bin/env python3
"""
TystText launcher - entry point for the packaged exe.

Sets up paths and environment, then starts the server and opens the browser.
"""

import os
import sys
import traceback
from pathlib import Path


def main() -> None:
    try:
        import threading
        import webbrowser
        from time import sleep

        # Explicit imports so PyInstaller bundles these packages.
        # They are loaded dynamically at runtime by SQLAlchemy/FastAPI/uvicorn
        # and PyInstaller cannot detect them via static analysis.
        import aiosqlite  # noqa: F401
        import aiosqlite.core  # noqa: F401
        import aiofiles  # noqa: F401
        import pydantic_settings  # noqa: F401
        import sqlalchemy.dialects.sqlite.aiosqlite  # noqa: F401
        import multipart  # noqa: F401
        import anyio  # noqa: F401
        import sniffio  # noqa: F401
        import starlette  # noqa: F401

        print("=" * 50)
        print("  TystText - Lokal transkribering")
        print("  http://localhost:8080")
        print("=" * 50)
        print()
        print("Startar server... (stäng detta fönster för att avsluta)")
        print()

        # --- Set up environment ---
        if getattr(sys, "frozen", False):
            app_dir = Path(sys.executable).parent
            bundle_dir = Path(sys._MEIPASS)  # type: ignore[attr-defined]
        else:
            app_dir = Path(__file__).parent
            bundle_dir = Path(__file__).parent

        # User data lives next to the exe (persists between runs)
        data_dir = app_dir / "data"
        data_dir.mkdir(exist_ok=True)

        # Set env vars (only if not already set, so .env can override)
        defaults = {
            "UPLOAD_DIR": str(data_dir / "uploads"),
            "MODELS_DIR": str(data_dir / "models"),
            "DATABASE_URL": f"sqlite+aiosqlite:///{data_dir / 'transcription.db'}",
            "STATIC_DIR": str(bundle_dir / "frontend" / "out"),
        }
        for key, value in defaults.items():
            os.environ.setdefault(key, value)

        # Load .env from data dir if it exists (for HF_TOKEN etc.)
        env_file = data_dir / ".env"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    os.environ.setdefault(key.strip(), value.strip())

        # Add backend to Python path so 'app' package is importable
        backend_path = str(bundle_dir / "backend")
        if backend_path not in sys.path:
            sys.path.insert(0, backend_path)

        bundle_root = str(bundle_dir)
        if bundle_root not in sys.path:
            sys.path.insert(0, bundle_root)

        print(f"  App dir:    {app_dir}")
        print(f"  Bundle dir: {bundle_dir}")
        print(f"  Data dir:   {data_dir}")
        print(f"  Static dir: {os.environ.get('STATIC_DIR')}")
        print()

        # Open browser in background
        def open_browser_delayed() -> None:
            sleep(2)
            webbrowser.open("http://localhost:8080")

        threading.Thread(target=open_browser_delayed, daemon=True).start()

        # Import and start server
        import uvicorn

        uvicorn.run(
            "app.main:app",
            host="127.0.0.1",
            port=8080,
            log_level="info",
        )

    except BaseException:
        print()
        print("=" * 50)
        print("  FEL: Servern kunde inte starta")
        print("=" * 50)
        print()
        traceback.print_exc()

    # Always keep window open - the server should run forever,
    # so if we get here something went wrong.
    print()
    input("Tryck Enter för att stänga...")


if __name__ == "__main__":
    main()
