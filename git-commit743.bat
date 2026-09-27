@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add supabase/migrations/20261005_disenchant_any.sql src/components/digital/RavenofCardDetailModal.tsx src/locales/lt/collection.json src/locales/en/collection.json src/lib/version.ts git-commit743.bat
git commit -m "743: Isardymas - galima isardyti bet kuria turima korta (ne tik dublikatus virs limito), ne dublikatui antras paspaudimas su ispejimu apie kalades; paskutine kopija salinama is user_collections; migracija 20261005_disenchant_any.sql; APP_VERSION 743" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JoeKHRowQ9gPcXNEz1bqGE"
git push
git log -1 --oneline
) > commit743.log 2>&1
