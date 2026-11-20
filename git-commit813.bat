@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/ui/ravenof-ui.css src/components/tutorial/TutorialGame.tsx src/lib/version.ts public/ravenof-ui/combat/avatars/frames supabase/migrations/20261120b_avatar_frames_set.sql git-commit813.bat
git commit -m "813: 8 avataro remeliu kolekcija (failai + migracija 20261120b) ir portreto kirpimas pagal kosmetinio remelio langa" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit813.log 2>&1
