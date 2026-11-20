@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/version.ts public/avatars/v2 supabase/migrations/20261120g_avatars_v2_batch2.sql src/lib/game/avatarPacks.ts src/components/tutorial/AvatarFx.tsx src/components/tutorial/TutorialGame.tsx git-commit818.bat git-commit819.bat
git commit -m "819: 8 nauji avatarai (is viso 18, migracija 20261120g) + avataru paraso efektai - iejimas, smugio daleles, zemo HP aura, pabaiga ir pergale pagal avataro profili" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit819.log 2>&1
