# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['runner.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('app', 'app'),
        ('python311/Lib/site-packages/faster_whisper/assets', 'faster_whisper/assets'),
    ],
    hiddenimports=[
        'uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto',
        'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan', 'uvicorn.lifespan.on',
        'sqlalchemy.dialects.sqlite', 'aiosqlite',
        'faster_whisper', 'ctranslate2', 'tokenizers', 'huggingface_hub',
        # Diarization (whisperx, pyannote)
        'whisperx', 'pyannote.audio', 'pyannote.core', 'pyannote.pipeline',
        'speechbrain', 'torch', 'torchaudio',
        # Anonymization (transformers)
        'transformers', 'transformers.models.bert',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='TystText-Backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
