@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/version.ts src/lib/game/avatarVoOverrides.ts src/lib/game/avatarVoManifest.json src/lib/game/avatarVoScript.json src/components/tutorial/TutorialGame.tsx src/app/admin/avatar-voices src/app/admin/page.tsx tools/gen-avatar-vo-manifest.py supabase/migrations/20261121_avatar_vo_overrides.sql supabase/migrations/20261121b_elemental_mage.sql src/lib/game/avatarPacks.ts public/avatars/v2 git-commit821.bat
git commit -m "821: balsai dar 6 avatarams (Nekronautas, Zariju kalvis, Sutarciu ragana, Vyriausiasis teisejas, Pelkiu ziniuone, Kapu giedotoja), Stygu mage tampa Stichiju mage, admin puslapis avataru balsams - perklausyti, pazymeti blogus, pakeisti ar prideti klipus (migracija 20261121_avatar_vo_overrides), zaidimas pataisas pasiima kovos pradzioje" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit821.log 2>&1
