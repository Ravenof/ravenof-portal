@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

if exist ".git\index.lock" del /f /q ".git\index.lock"

git add src/lib/game/curseEngine.ts
git add src/lib/tutorial/engine.ts
git add supabase/migrations/20260613_deck_side_deck.sql
git add git-commit51.bat

git commit -m "fix(curse): teisinga prakeiksmu mechanika - imama is caster side deck ir imaisoma i prieso main deck, efektas suveikia kai priesas istraukia (pilni mappingai); +DB migracija deck_cards.is_side_deck"

git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause
