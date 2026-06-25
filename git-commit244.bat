@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/StoreModal.tsx src/components/digital/QuestsModal.tsx src/components/digital/SeasonPassModal.tsx src/components/digital/SettingsModal.tsx src/components/digital/CosmeticsModal.tsx src/components/digital/DailyDealModal.tsx src/components/digital/ranked/_ui.tsx src/components/digital/ranked/MatchFound.tsx src/components/digital/ranked/RankedQueue.tsx src/components/digital/ranked/RankedResult.tsx src/components/tutorial/TutorialGame.tsx src/components/social/FriendsClient.tsx src/app/digital/friends/page.tsx src/components/digital/MoreScreen.tsx git-commit244.bat
git commit -m "polish(digital): visi popup modalai (Parduotuve/Uzduotys/Sezonas/Nustatymai/Kosmetika/Dienos korta) + Ranked overlay'ai (_ui OctPanel/MatchFound/Queue/Result) perdaryti is octagon+neon i rounded glass (svelnesni borderiai, be o ornamentu). Kovos chat widget (TutorialGame) - rounded panel, burbulu uodegos, touch input, safe-area. Draugu chat: naujas /digital/friends ekranas digital shell viduje (be portal header), chat safe-area; MoreScreen Draugai -> /digital/friends."
git push
) > commit244.log 2>&1
