@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/app/admin/shop/AdminShopClient.tsx git-commit301.bat
git commit -m "feat(avatars): 3 etapas - admin CRUD + audio upload. Naujas 'Avatarai' tab Parduotuves admin'e: avataro kurimas/redagavimas/trynimas su naujais laukais (rarity/status active|hidden|draft/owned_by_default), portreto ikelimas (ShopImageUpload -> card-images), emoji fallback, kainos/eiles. Validacija: id+pavadinimas privalomi, aktyviam reikia img/emoji, kaina >=0. AdminAvatarAudio: per 7 ivykiu tipus (Pradzios fraze/Gauta zala/Pralaimejimas/Pergale/Burtu metimas/Zema gyvybe/Pasirinkta) - klipu ikelimas i avatar-audio bucket + insert i avatar_audio, preview <audio>, weight (random svoris), enabled toggle, trynimas. tsc svarus."
git push
) > commit301.log 2>&1
