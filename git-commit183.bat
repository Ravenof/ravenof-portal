@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add supabase/migrations/20260622_ranked_real_pvp.sql src/lib/ranked/client.ts src/components/digital/ranked/RankedQueue.tsx src/components/digital/ranked/RankedClient.tsx src/components/tutorial/TutorialGame.tsx git-commit183.bat
git commit -m "fix(ranked): suporavus du tikrus zaidejus kova vyksta per realu realtime PvP sync (pvp_matches host/guest), o ne lokalu Ais - rvn_queue_poll sukuria kambari ir grazina matchId+isHost; RankedClient paleidzia TutorialGame su net (ne practice); meWon visada game.winner===you (host+svecias swapPerspective), kad rezultatas teisingas abiem"
git push
) > commit183.log 2>&1
