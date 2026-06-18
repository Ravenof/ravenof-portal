@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git rm -f --ignore-unmatch public/sounds/music/battle-5.mp3 public/sounds/music/battle-6.mp3 public/sounds/music/battle-7.mp3
git add src/lib/ui-sound.ts src/lib/game/soundManager.ts src/lib/game/musicManager.ts public/sounds/ui/README.md public/sounds/battle/README.md public/sounds/music/battle-3.mp3 public/sounds/music/battle-4.mp3 git-commit148.bat
git commit -m "feat(audio): visi synth SFX -> file-first mp3 su variantais (ui-sound + battle soundManager), synth lieka tik fallback; kovos muzika 4 trekai (pasalinti battle-5/6/7); README su failu vardais"
git push
) > commit148.log 2>&1
