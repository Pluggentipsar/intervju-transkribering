TystText Backend
================

Lokal backend for TystText transkribering.

SNABBSTART
----------
1. Dubbelklicka pa "Starta-TystText.bat"
2. Forsta gangen tar det nagra minuter att installera beroenden
3. Webblasaren oppnas automatiskt till TystText

KRAV
----
- Windows 10 eller senare
- Python 3.11 eller senare (https://www.python.org/downloads/)
  VIKTIGT: Bocka i "Add Python to PATH" vid installation!

KONFIGURATION (valfritt)
------------------------
For talarigenkanning (identifiera vem som pratar):

1. Skapa ett konto pa HuggingFace: https://huggingface.co/
2. Skapa en token: https://huggingface.co/settings/tokens
3. Acceptera licensen for pyannote-modellerna:
   - https://huggingface.co/pyannote/speaker-diarization-3.1
   - https://huggingface.co/pyannote/segmentation-3.0
4. Kopiera .env.example till .env
5. Klistra in din token i .env-filen

FELSÖKNING
----------
Om nagot inte fungerar:
1. Kontrollera att Python ar installerat: oppna cmd och skriv "python --version"
2. Starta om datorn efter Python-installation
3. Ta bort "venv"-mappen och kör Starta-TystText.bat igen

MAPPAR
------
- venv/     Virtuell Python-miljo (skapas automatiskt)
- app/      Backend-kod
- .env      Din konfiguration (skapa fran .env.example)

SUPPORT
-------
https://github.com/anthropics/claude-code/issues
