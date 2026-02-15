#!/usr/bin/env python3
"""Build a clean release ZIP for TystText backend distribution.

Creates TystText-Backend.zip containing only what's needed:
- backend/app/          (application code)
- backend/requirements.txt
- backend/.env.example
- frontend/out/         (pre-built frontend)
- TystText-Setup.bat    (one-time installer)
- TystText-Start.bat    (daily launcher)

Excludes: venv, __pycache__, .db, uploads, models, .env, etc.
"""

import zipfile
from pathlib import Path

ROOT = Path(__file__).parent
OUTPUT = ROOT / "TystText-Backend.zip"
PREFIX = "TystText-Backend"  # folder name inside zip

# Directories and files that should never be included
SKIP_DIRS = {
    "__pycache__", ".git", "node_modules", ".next", "venv", "venv_py311",
    ".venv", "uploads", ".mypy_cache", ".pytest_cache",
    ".ruff_cache", "dist", "build", ".eggs",
}
SKIP_EXTENSIONS = {".pyc", ".pyo", ".db", ".sqlite", ".sqlite3", ".log", ".spec"}
SKIP_FILES = {".env", "config.txt", ".DS_Store", "Thumbs.db"}


def should_include(path: Path, base: Path) -> bool:
    """Check if a file should be included in the ZIP."""
    rel = path.relative_to(base)
    parts = set(rel.parts)

    # Skip excluded directories
    if parts & SKIP_DIRS:
        return False

    # Skip by extension
    if path.suffix in SKIP_EXTENSIONS:
        return False

    # Skip specific files
    if path.name in SKIP_FILES:
        return False

    return True


def build_zip() -> None:
    """Build the release ZIP."""
    backend_dir = ROOT / "backend"
    app_dir = backend_dir / "app"

    if not app_dir.is_dir():
        print(f"[FEL] backend/app/ hittades inte i {ROOT}")
        return

    files_to_add: list[tuple[Path, str]] = []

    # 1. Backend application code
    for path in app_dir.rglob("*"):
        if path.is_file() and should_include(path, backend_dir):
            arcname = f"{PREFIX}/backend/{path.relative_to(backend_dir)}"
            files_to_add.append((path, arcname))

    # 2. Backend config files
    for fname in ["requirements.txt", "pyproject.toml", ".env.example"]:
        fpath = backend_dir / fname
        if fpath.is_file():
            files_to_add.append((fpath, f"{PREFIX}/backend/{fname}"))

    # 3. Pre-built frontend
    frontend_out = ROOT / "frontend" / "out"
    if frontend_out.is_dir():
        for path in frontend_out.rglob("*"):
            if path.is_file():
                arcname = f"{PREFIX}/frontend/out/{path.relative_to(frontend_out)}"
                files_to_add.append((path, arcname))
        print(f"  [OK] Frontend inkluderad fran frontend/out/")
    else:
        print(f"  [VARNING] frontend/out/ hittades inte - bygg frontend forst!")
        print(f"            cd frontend && npm run build")

    # 4. Root scripts
    for fname in ["TystText-Setup.bat", "TystText-Start.bat"]:
        fpath = ROOT / fname
        if fpath.is_file():
            files_to_add.append((fpath, f"{PREFIX}/{fname}"))

    # Build the ZIP
    with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as zf:
        for filepath, arcname in sorted(files_to_add, key=lambda x: x[1]):
            zf.write(filepath, arcname)
            print(f"  + {arcname}")

    size_kb = OUTPUT.stat().st_size / 1024
    print(f"\n[OK] {OUTPUT.name} skapad ({size_kb:.0f} KB, {len(files_to_add)} filer)")


if __name__ == "__main__":
    print("=" * 50)
    print("  TystText - Bygger release-ZIP")
    print("=" * 50)
    print()
    build_zip()
