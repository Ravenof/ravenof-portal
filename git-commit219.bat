@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add supabase/migrations/20260626_gamification.sql supabase/migrations/20260627_cosmetics_daily_deal.sql src/lib/gamification/quests.ts src/lib/gamification/seasonPass.ts src/lib/gamification/rewardLabel.ts src/lib/cosmetics.ts src/components/digital/QuestsModal.tsx src/components/digital/SeasonPassModal.tsx src/components/digital/CosmeticsModal.tsx src/components/digital/DailyDealModal.tsx src/components/digital/DigitalHub.tsx src/components/digital/PackOpen.tsx src/components/tutorial/TutorialGame.tsx git-commit219.bat
git commit -m "feat(digital): dienos uzduotys + prisijungimo serija + sezono kelias, kosmetika (nugareles/lentos/avatarai) ir dienos korta pasiulymas (>=1 epic+, atsinaujina kasdien). RPC: quests/streak/season_pass/cosmetics/daily_deal (SECURITY DEFINER, reuse rvn__grant_payload); quest hookai i pergale/pakuotes atplesima; hub plyteles + login check-in"
git push
) > commit219.log 2>&1
