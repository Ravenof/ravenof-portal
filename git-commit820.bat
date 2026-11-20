@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/version.ts src/lib/cosmetics.ts src/lib/game/avatarPacks.ts src/lib/game/avatarAudio.ts src/lib/game/avatarVoManifest.json src/components/tutorial/TutorialGame.tsx public/avatars/v2 tools/gen-avatar-vo-manifest.py git-commit820.bat
git commit -m "820: avataru balsai is statiniu klipu - Korvas ir Gelezine sesuo (LT+EN, po 5 variantus), nauji ivykiai bigHit/attack/kill/idle, mini dialogai kovos pradzioje, variantai nesikartoja is eiles" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit820.log 2>&1
