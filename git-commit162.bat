@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/SummonBurst.tsx git-commit162.bat
git commit -m "feat(fx): ledas - pasalinta didele snaige, dabar issiplecianti serksno banga + tankesnis kristalu purslas; visiems efektams pridetas bendras issiplecianti svytejimo aura (vienodas expanded stilius)"
git push
) > commit162.log 2>&1
