@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/SceneFxLayer.tsx supabase/migrations/20261121d_retire_old_avatars.sql src/lib/ranked/bots.ts src/lib/game/musicManager.ts src/lib/version.ts src/lib/game/avatarVoManifest.json src/lib/game/avatarVoScript.json src/lib/game/avatarSayLines.json src/lib/game/avatarPacks.ts src/lib/game/avatarAudio.ts src/components/tutorial/TutorialGame.tsx src/components/tutorial/AvatarFx.tsx src/components/tutorial/EmoteWheel.tsx src/components/tutorial/BattleLayout.tsx src/components/tutorial/DesktopBattleLayout.tsx tools/gen-avatar-vo-manifest.py public/avatars/v2 git-commit823.bat git-commit824.bat
git commit -m "824 (su 823 turiniu, kuris nebuvo ikeltas i git): emociju ratas, laikmacio replikos, visi 54 avataru dialogai; kovoje muzika tylesne ir pritildoma kol kalba avataras; seni avatarai isimti (migracija 20261121d), botai su naujais avatarais; kortos miniatiura ir ZMK korta nebeuzdengia avataro, kai jis gauna zala" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit824.log 2>&1
