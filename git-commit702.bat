@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/PackOpen.tsx src/lib/version.ts git-commit702.bat
git commit -m "702: pack open fix - kortos nebeuzstringa ties nugarelemis (laikmaciu sekos klaida), daug lengvesnis FX (be canvas shadowBlur, sprite daleles, RAF tik kai reikia, FX biudzetas pagal irengini), kolekcija perkraunama tik pabaigoje" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_015TLWcibxvH546P5Uog8kPs"
git push
git log -1 --oneline
) > commit702.log 2>&1
