/**
 * Build script for packaging the Python backend as an executable.
 * Uses PyInstaller to create a standalone exe that can be bundled with Tauri.
 */

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const BACKEND_DIR = path.resolve(__dirname, "../../backend");
const TAURI_BINARIES_DIR = path.resolve(__dirname, "../src-tauri/binaries");

// Get the target triple for the current platform
function getTargetTriple() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "win32") {
    return arch === "x64" ? "x86_64-pc-windows-msvc" : "i686-pc-windows-msvc";
  } else if (platform === "darwin") {
    return arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
  } else if (platform === "linux") {
    return arch === "x64" ? "x86_64-unknown-linux-gnu" : "i686-unknown-linux-gnu";
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

function run(cmd, cwd = process.cwd()) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

async function main() {
  console.log("=== Building TystText Backend ===\n");

  const targetTriple = getTargetTriple();
  const exeName =
    process.platform === "win32"
      ? `tysttext-backend-${targetTriple}.exe`
      : `tysttext-backend-${targetTriple}`;

  // Ensure binaries directory exists
  if (!fs.existsSync(TAURI_BINARIES_DIR)) {
    fs.mkdirSync(TAURI_BINARIES_DIR, { recursive: true });
  }

  // Check if PyInstaller is installed
  console.log("Checking PyInstaller...");
  try {
    run("pip show pyinstaller", BACKEND_DIR);
  } catch {
    console.log("Installing PyInstaller...");
    run("pip install pyinstaller", BACKEND_DIR);
  }

  // Create a runner script for PyInstaller
  const runnerScript = `
"""Runner script for PyInstaller."""
import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info"
    )
`;

  const runnerPath = path.join(BACKEND_DIR, "runner.py");
  fs.writeFileSync(runnerPath, runnerScript);

  // Run PyInstaller
  console.log("\nRunning PyInstaller...");
  const pyinstallerCmd = [
    "pyinstaller",
    "--onefile",
    "--name=tysttext-backend",
    "--hidden-import=uvicorn.logging",
    "--hidden-import=uvicorn.loops",
    "--hidden-import=uvicorn.loops.auto",
    "--hidden-import=uvicorn.protocols",
    "--hidden-import=uvicorn.protocols.http",
    "--hidden-import=uvicorn.protocols.http.auto",
    "--hidden-import=uvicorn.protocols.websockets",
    "--hidden-import=uvicorn.protocols.websockets.auto",
    "--hidden-import=uvicorn.lifespan",
    "--hidden-import=uvicorn.lifespan.on",
    "--hidden-import=sqlalchemy.dialects.sqlite",
    "--hidden-import=aiosqlite",
    "--collect-all=whisper",
    "--collect-all=transformers",
    "--collect-all=torch",
    "--add-data=app:app",
    "--noconfirm",
    "runner.py",
  ].join(" ");

  try {
    run(pyinstallerCmd, BACKEND_DIR);
  } catch (error) {
    console.error("PyInstaller failed:", error.message);
    console.log("\nTrying simplified build...");

    // Simplified build without heavy ML libraries (for testing)
    const simpleCmd = [
      "pyinstaller",
      "--onefile",
      "--name=tysttext-backend",
      "--hidden-import=uvicorn.logging",
      "--hidden-import=uvicorn.loops.auto",
      "--hidden-import=uvicorn.protocols.http.auto",
      "--hidden-import=uvicorn.protocols.websockets.auto",
      "--hidden-import=uvicorn.lifespan.on",
      "--hidden-import=sqlalchemy.dialects.sqlite",
      "--hidden-import=aiosqlite",
      "--add-data=app:app",
      "--noconfirm",
      "runner.py",
    ].join(" ");

    run(simpleCmd, BACKEND_DIR);
  }

  // Copy the built executable to Tauri binaries
  const builtExe =
    process.platform === "win32"
      ? path.join(BACKEND_DIR, "dist", "tysttext-backend.exe")
      : path.join(BACKEND_DIR, "dist", "tysttext-backend");

  const targetExe = path.join(TAURI_BINARIES_DIR, exeName);

  if (fs.existsSync(builtExe)) {
    console.log(`\nCopying ${builtExe} to ${targetExe}...`);
    fs.copyFileSync(builtExe, targetExe);

    // Make executable on Unix
    if (process.platform !== "win32") {
      fs.chmodSync(targetExe, 0o755);
    }

    console.log("\n=== Backend build complete! ===");
    console.log(`Executable: ${targetExe}`);
  } else {
    console.error("Build failed: executable not found");
    process.exit(1);
  }

  // Clean up
  fs.unlinkSync(runnerPath);
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
