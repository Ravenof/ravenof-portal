@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/lib/game/types.ts
git add src/lib/tutorial/engine.ts
git add src/components/admin/GameplayConfigEditor.tsx
git add src/lib/version.ts
git add git-commit456.bat
git commit -m "feat(effects): 3 nauji pasyvai mapping/aura sistemoje (uzsakymas). (1) IMUNITETAS BUSENOMS (auraStatusImmunity): paveikti padarai negauna frozen/burning/poisoned/stunned/silenced (blessed praleidziamas) - guard applyStatus virsuje su log; flag perskaiciuojamas recomputeAuras (reset step1 + step3 pagal scope/potipi/frakcija). (2) ISIUTIS (enrageAttack): +X ATK kol padaras SUZEISTAS (hp < maxHp); step 3c recomputeAuras po auru (maxHp jau galutinis); perskaiciavimas po zalos (dealToUnit else saka) ir po gydymo (healUnitPrim) - pagijus iki pilno priedas dingsta; silence isjungia. (3) ZALA ZAIDEJAMS x2 (auraHeroDamageDouble): kol korta lauke (padaras nenutildytas arba artefaktas) - dealToPlayer dmg dvigubinamas ABIEM zaidejams su log; heroDamageDoubleActive helperis. ADMIN GameplayConfigEditor: checkbox Imunitetas busenoms, checkbox Zala zaidejams dviguba, number input Isiutis +ATK; auraOn detekcija + isjungimo reset papildyti. parseGameplayConfig pass-through - nauji laukai teka automatiskai. APP_VERSION=456. tsc+eslint svarus." > commit456.log 2>&1
git push >> commit456.log 2>&1
type commit456.log
echo ============= BAIGTA (3 nauji efektai, v456). =============
pause
