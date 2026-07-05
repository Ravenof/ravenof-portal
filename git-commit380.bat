@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260817_craft.sql
git add src/lib/gamification/craft.ts
git add src/components/digital/DigitalCollection.tsx
git add git-commit380.bat
echo === Commit ===
git commit -m "feat(economy phase8): craft (dublikatai->Esencija; kurimas). migr 20260817: economy_config.craft (disenchant/craft reiksmes pagal rarity sort_order 1-6; admin); rvn__card_rarity_tier (champion tipas->6) + rvn__card_copy_limit (rarities.copy_limit=tikra deck riba); rvn_disenchant_card (tik dublikatus virs copy_limit -> essence), rvn_craft_card (iki copy_limit, tikrina essence). craft.ts servisas. DigitalCollection PreviewModal: 🔮 essence + 'Dulkinti +N' / 'Sukurti N' mygtukai; reload po veiksmo. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause
