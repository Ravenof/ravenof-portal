@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/CosmeticsModal.tsx git-commit302.bat
git commit -m "feat(avatars): 4 etapas - shop/profilis portretai + balso preview. CosmeticsModal avatarai dabar rodo PORTRETUS (imageUrl, apvalus ornate remas) vietoj vien emoji (emoji = fallback). Rarity badge (legendary/epic/rare spalvos). 'Peržiūrėti balsą' 🔊 mygtukas - groja selected/fightStart klipa (getAvatarAudio uzkraunamas avatar tab'ui). Pirkimo mygtukas: 'Nepakanka aukso' (disabled) kai per mazai aukso; 'Pasirinkti'/'✓ Pasirinkta' equip. CosmeticsModal dengia ir shop, ir profilio avataro pasirinkima. tsc svarus."
git push
) > commit302.log 2>&1
