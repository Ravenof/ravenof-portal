@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/tutorial/BattleLayout.tsx
git add src/components/tutorial/TutorialGame.tsx
git add git-commit394.bat
echo === Commit ===
git commit -m "feat(combat F5): kaire puse - preview panele + emote ratas. Preview: hoverCard renderinamas i fiksuota kaires panele (MiniCard w200 + vardas/efektas); floating cursor tooltip issjungtas H layout'e. Emote: radialinis 6 emote ratas (rail 😊 mygtukas), 5s cooldown, burbulas prie savo/priesio avataro 3s (rvnEmotePop). PvP -> broadcast 'emote' event esamu kanalu (senas klientas be handler'io tyliai ignoruoja - backward-safe). Musio zurnalas jau kaireje. tsc svarus." > commit394.log 2>&1
echo === Push ===
git push >> commit394.log 2>&1
type commit394.log
echo.
echo ============= BAIGTA (F5). =============
