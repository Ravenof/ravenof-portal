@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Naikinam likusi index.lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam kampanijos failus ===
git add src/components/admin/campaign/AdminCampaignsList.tsx
git add src/components/admin/campaign/AdminNodeEditor.tsx
git add src/components/admin/campaign/AdminCampaignEditor.tsx
git add src/lib/campaign/missionLoader.ts
git add src/lib/campaign/types.ts
git add src/lib/campaign/validate.ts
git add src/lib/campaign/seedRebuild.ts
git add src/lib/campaign/seedTypes.ts
git add src/data/campaignSeeds/prazarasVarngradasCampaign.ts
git add supabase/migrations/20260709_campaign_canon_fields.sql
git add supabase/migrations/20260710_campaign_varngradas_cards.sql
git add git-commit260.bat git-commit261.bat git-commit263.bat
echo === Commit ===
git commit -m "feat(campaign): kanono pass + kortos (260+261 sujungti) - 18 mazgu Varngrado, Seed/Rebuild, seedRebuild/seedTypes, canon laukai, 49 kortos + story kalades"
echo === Push ===
git push
echo.
echo ====================================================
echo BAIGTA. Patikrink virsuje ar nera klaidu (raudonai).
echo ====================================================
pause
