@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx src/components/tutorial/PracticeButton.tsx "src/app/community-decks/[deckId]/page.tsx" src/components/my-decks/MyDecksList.tsx git-commit76.bat
git commit -m "feat(practice): praktikos rezimas pries AI - priesas naudoja kita kalade (viesa public deck arba random is pasirinktos frakcijos), ne veidrodi; TutorialGame practice props + setup mygtukas (PracticeButton) community-decks ir my-decks"
git push
) > commit76.log 2>&1
