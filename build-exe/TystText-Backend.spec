# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['runner.py'],
    pathex=['python311/Lib/site-packages'],
    binaries=[],
    datas=[
        ('app', 'app'),
        ('python311/Lib/site-packages/faster_whisper/assets', 'faster_whisper/assets'),
        # Lightning/PyTorch packages need version.info files
        ('python311/Lib/site-packages/lightning/version.info', 'lightning'),
        ('python311/Lib/site-packages/lightning_fabric/version.info', 'lightning_fabric'),
        ('python311/Lib/site-packages/pytorch_lightning/version.info', 'pytorch_lightning'),
        # Speechbrain needs utils folder
        ('python311/Lib/site-packages/speechbrain/utils', 'speechbrain/utils'),
        # Transformers needs data files
        ('python311/Lib/site-packages/transformers', 'transformers'),
    ],
    hiddenimports=[
        'uvicorn', 'uvicorn.main', 'uvicorn.config', 'uvicorn.server',
        'uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto',
        'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan', 'uvicorn.lifespan.on',
        'sqlalchemy.dialects.sqlite', 'aiosqlite',
        'faster_whisper', 'ctranslate2', 'tokenizers', 'huggingface_hub',
        # Diarization (whisperx, pyannote)
        'whisperx', 'whisperx.diarize',
        'pyannote.audio', 'pyannote.audio.pipelines', 'pyannote.audio.pipelines.speaker_diarization',
        'pyannote.core', 'pyannote.pipeline', 'pyannote.database',
        'speechbrain', 'speechbrain.pretrained', 'speechbrain.pretrained.interfaces',
        'torch', 'torchaudio',
        # Anonymization (transformers)
        'transformers', 'transformers.models', 'transformers.models.bert',
        'transformers.pipelines', 'transformers.pipelines.token_classification',
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
