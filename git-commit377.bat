@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add supabase/migrations/20260814_season_path.sql
git add src/lib/gamification/seasonPath.ts
git add src/components/digital/SeasonPathModal.tsx
git add src/components/digital/DigitalHub.tsx
git add git-commit377.bat
echo === Commit ===
git commit -m "feat(economy phase5): sezono kelias 20 lygiu (free+pass). migr 20260814: prapletos season_pass_seasons(theme/prices/grace)+user_season_pass(has_season_pass); economy_config.season_path (20 lvl free+pass sablonas pagal spec, admin); user_season_reward_claims; rvn__current_season (get-or-create ketvircio sezona Q1-Q4); rvn__add_pass_xp perkurta (visada i einamaji sezona); rvn_get_season_path/rvn_claim_season_reward(free|pass, velyvas pass unlock atrakina praeitus)/rvn_unlock_season_pass(8000 Sidabras|950 Rubinai). seasonPath.ts + SeasonPathModal.tsx (2 takai, unlock, atsiimti viska). DigitalHub StatCard->Lygis X/20 + naujas modalas. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. =============
pause
