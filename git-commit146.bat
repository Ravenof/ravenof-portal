@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/musicManager.ts public/sounds/music/menu-theme.mp3 public/sounds/music/battle-1.mp3 public/sounds/music/battle-2.mp3 public/sounds/music/battle-3.mp3 public/sounds/music/battle-4.mp3 public/sounds/music/battle-5.mp3 public/sounds/music/battle-6.mp3 public/sounds/music/battle-7.mp3 git-commit146.bat
git commit -m "feat(audio): ikelti fono muzikos mp3 (menu-theme + 7 kovos trekai) ir isplesti musicManager iki 7 random treku su error-skip"
git push
) > commit146.log 2>&1
