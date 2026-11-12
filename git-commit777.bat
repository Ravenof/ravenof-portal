@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/version.ts src/lib/tutorial2/deskText.ts src/components/tutorial2/TutorialDirector.tsx src/components/tutorial2/TutorialOverlay.tsx src/components/tutorial2/TutorialHub.tsx scripts/tutorial-v3-check.ts scripts/tutorial-card-names.json git-commit777.bat
git commit -m "777: mokymu perziuros pataisos. Kompiuteryje tekstai kalba apie pele, ne pirsta; virsuje viena juosta (zingsnis, tikslas, praleisti pamoka) vietoj mygtuko ant kovos kampo; dialogo mygtukas visada Toliau; dialoge neberodomas pakartotas balso tekstas; paskutiniame zingsnyje neberodomas senas tikslas; pamoku sarase numeriu zenklai vietoj emoji ir bendras remo plotis; tutorial:check tikrina pries tikru kortu sarasa" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit777.log 2>&1
