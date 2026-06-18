@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/types.ts src/lib/game/voiceManager.ts src/lib/game/musicManager.ts src/components/tutorial/TutorialGame.tsx src/components/admin/VoiceLinesUpload.tsx src/components/admin/GameplayConfigEditor.tsx src/components/admin/CardForm.tsx src/components/digital/DigitalHub.tsx supabase/card_audio_v1.sql public/sounds/music/README.md git-commit145.bat
git commit -m "feat(audio): per-kortos summon balsai + fono muzika - voiceManager (lazy fetch+decode, LRU, vienas kanalas, prefetch) + gameplay.voiceLines + admin VoiceLinesUpload (card-audio bucket); musicManager streaming kovos muzika (5 random trekai) ir main menu tema su crossfade; veikia tutorial/PvE/PvP per TutorialGame; migracija supabase/card_audio_v1.sql; muzikos failai public/sounds/music/"
git push
) > commit145.log 2>&1
