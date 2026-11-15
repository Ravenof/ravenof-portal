@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/digital/liveEvents.ts src/components/digital/LiveEventsLayer.tsx src/app/admin/live-events/page.tsx src/app/admin/live-events/LiveEventsAdminClient.tsx src/app/admin/page.tsx src/app/digital/layout.tsx src/components/digital/DigitalHub.tsx src/components/tutorial/TutorialGame.tsx src/lib/economy.ts src/lib/version.ts supabase/migrations/20261115b_live_events.sql git-commit790.bat
git commit -m "790: live eventai - eventu lentele ir adminas (paleisti dabar arba pagal grafika savaites dienomis ir valandomis, banerio ikelimas su zidiniu), pilno ekrano pop-up ijungus zaidima ir mazas baneris pradzios ekrane, kovos atlygiu daugikliai (sidabras, XP, sezono XP, pirmoji dienos pergale), prisijungimo dovanos (kasdien, karta, kalendorius, sugrizusiam), evento zetonai ir evento parduotuve, kosmetikos rinkiniai su pakaitalu; migracija 20261115b" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2pquWqjVVw7HiXJktG"
git push
git log -1 --oneline
) > commit790.log 2>&1
