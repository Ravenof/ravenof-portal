@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260816_cosmetics.sql
git add src/components/digital/CosmeticsModal.tsx
git add src/components/digital/DigitalHub.tsx
git add git-commit379.bat
echo === Commit ===
git commit -m "feat(economy phase7): cosmetics (tik card_back + player_avatar). migr 20260816: seed 8 placeholder cosmetics (4 nugareles + 4 avatarai, slug=reward/shop item_id; admin uzpildys art/audio); grant_reward_payload PERKURTA - card_back/player_avatar -> user_cosmetics (owned+equippable per esama rvn_equip_cosmetic), fallback user_inventory jei ne kataloge. CosmeticsModal: boards PASLEPTI (KINDS=card_back+avatar), relabel LT. DigitalHub: 'Kosmetika' mygtukas atidaro modala. Esama avatar/battle integracija (equipped_avatar+avatar_audio) nepaliesta. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause
