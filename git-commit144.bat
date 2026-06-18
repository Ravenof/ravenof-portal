@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/types.ts src/lib/game/voiceManager.ts src/components/tutorial/TutorialGame.tsx src/components/admin/VoiceLinesUpload.tsx src/components/admin/GameplayConfigEditor.tsx src/components/admin/CardForm.tsx supabase/card_audio_v1.sql git-commit144.bat
git commit -m "feat(audio): per-kortos iskvietimo balsai - kelios garso failai/kortai (gameplay.voiceLines), summon metu grojamas atsitiktinis; lag-safe voiceManager (lazy fetch+decode, LRU cache, in-flight dedup, vienas balso kanalas, prefetch ant draw); admin VoiceLinesUpload (card-audio bucket); veikia tutorial/PvE/PvP per TutorialGame; migracija supabase/card_audio_v1.sql"
git push
) > commit144.log 2>&1
