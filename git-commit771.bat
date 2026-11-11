@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/version.ts git-commit771.bat
git commit -m "771: versijos numeris - DI lygiu pakeitimai (antras 770 commit) buvo isleisti tuo paciu 770 numeriu, todel klientai ju negavo. Kodo pakeitimu nera. APP_VERSION 771" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit771.log 2>&1
