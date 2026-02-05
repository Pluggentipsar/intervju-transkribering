"""
TystText Backend Runner
This script is packaged by PyInstaller to create the standalone executable.
"""
import os
import sys

# Fix Windows symlink issues with HuggingFace Hub
# Must be set BEFORE importing any HF libraries
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS"] = "1"  # Actually disable symlinks, not just the warning

# Set up the environment for the bundled app
if getattr(sys, 'frozen', False):
    # Running as compiled exe
    bundle_dir = sys._MEIPASS
    exe_dir = os.path.dirname(sys.executable)
    os.chdir(bundle_dir)

    # Set model cache to a persistent location (not temp dir)
    # This avoids symlink issues on Windows
    cache_dir = os.path.join(os.path.expanduser("~"), ".cache", "tysttext")
    os.makedirs(cache_dir, exist_ok=True)

    # Configure all caching libraries to use this directory
    os.environ["HF_HOME"] = cache_dir
    os.environ["HF_HUB_CACHE"] = os.path.join(cache_dir, "hub")
    os.environ["TRANSFORMERS_CACHE"] = os.path.join(cache_dir, "transformers")
    os.environ["TORCH_HOME"] = os.path.join(cache_dir, "torch")

    # Load HF token from config file if it exists
    config_file = os.path.join(exe_dir, "config.txt")
    if os.path.exists(config_file):
        with open(config_file, "r") as f:
            for line in f:
                if line.startswith("HF_TOKEN="):
                    os.environ["HF_TOKEN"] = line.strip().split("=", 1)[1]
                    break
else:
    # Running in normal Python environment
    bundle_dir = os.path.dirname(os.path.abspath(__file__))

# Add the app directory to the path
sys.path.insert(0, bundle_dir)

import uvicorn
from app.main import app

if __name__ == "__main__":
    print("=" * 50)
    print("  TystText Backend Server")
    print("  http://127.0.0.1:8000")
    print("=" * 50)
    print()

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info"
    )
