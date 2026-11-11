@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/game/fxStage.ts src/app/dev/fx/page.tsx src/lib/version.ts git-commit765.bat
git commit -m "765: FX pilotas /dev/fx - pataisyta, kad naujas variantas tikrai butu rodomas: teksturos kraunamos is karto atidarius puslapi (anksciau tik ijungus, todel pirmas paspaudimas tyliai nugrodavo sena efekta), palyginimo mygtukas naujo varianto negroja kol teksturos neikeltos, virs arenos rodoma kuris variantas groja (SENAS / NAUJAS) ir teksturu busena; APP_VERSION 765" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit765.log 2>&1
