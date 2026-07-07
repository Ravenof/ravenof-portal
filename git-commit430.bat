@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/lib/cosmetics.ts
git add src/components/tutorial/ArenaBackground.tsx
git add src/components/tutorial/TutorialGame.tsx
git add git-commit430.bat
git commit -m "feat(cosmetics): equipped skins pagaliau RENDERINAMI kovoje. (1) lib/cosmetics: getEquippedBattleSkins (nugarele+lenta is rvn_get_cosmetics) + sessionStorage cache (cachedBattleSkins - kova gauna skins iskart, RPC fone atnaujina). (2) PileBack: 'plain' nugareles (tavo kalade, prieso ranka/kalade) rodo equipped nugarele (imageUrl arba css gradientas) su fallback i default back.webp jei nepavyksta uzkrauti. (3) ArenaBackground: naujas boardUrl prop - lentos skin fonas virs proceduri nes arenos/arenos art (opacity fade + vignette), bet PO lauko kortos fonu (fieldBg islieka virsesnis); proceduriniai sluoksniai isjungiami kai board art uzsikrauna (PERF). (4) TutorialGame mount'e uzkrauna skins (cache->fresh) + setSkinTick re-render. Veikia visuose rezimuose (bot/pvp/ranked/campaign) nes viskas eina per TutorialGame. tsc svarus." > commit430.log 2>&1
git push >> commit430.log 2>&1
type commit430.log
echo ============= BAIGTA (equipped skins kovoje). =============
