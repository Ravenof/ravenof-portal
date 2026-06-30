@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260730_avatar_system.sql src/lib/cosmetics.ts git-commit299.bat
git commit -m "feat(avatars): 1 etapas - DB + audio backend. Plecia esama cosmetics (kind=avatar): nauji laukai image_url/rarity/status(active|hidden|draft)/owned_by_default/created_at/updated_at. Nauja avatar_audio lentele (event_type fightStart|hit|defeat|victory|spellCast|lowHp|selected, file_url, enabled, weight) + RLS (read all, admin write). Admin write policy cosmetics. Storage bucket'ai avatar-portraits (3MB img) + avatar-audio (2MB mp3/wav/ogg/webm) su public read + admin write. rvn_get_cosmetics praplestas (imageUrl/rarity/ownedByDefault; owned iskaito owned_by_default). rvn_equip_cosmetic leidzia equip owned_by_default. Nauja rvn_get_avatar_audio(ids[]) battle'iui. 2 default avatarai (Nekronautas owned-by-default, Inkvizitorius). cosmetics.ts: Cosmetic tipas + getAvatarAudio API. tsc svarus."
git push
) > commit299.log 2>&1
