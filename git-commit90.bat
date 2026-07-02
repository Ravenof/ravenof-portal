@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
( git add src/lib/game/types.ts src/lib/game/effectEngine.ts src/components/admin/GameplayConfigEditor.tsx & git commit -m "feat(effects): follow-up grandine 'tada padaryk ir X' - kiekvienas mapping gali tureti then[] sarasa, kuris ivykdomas po pagrindinio efekto (pvz champ sunaikina savo padara -> tada self heal); gylio apsauga MAX_DEPTH; admine '+ Tada padaryk dar' editorius" & git push ) > commit90.log 2>&1
