@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/tutorial/BattleLayout.tsx
git add src/components/tutorial/TutorialGame.tsx
git add git-commit403.bat
echo === Commit ===
git commit -m "fix(combat H v3): playtest feedback. (1) KRITINE: kompaktiskus dydzius trigger'ino isTouch, bet webview'e pointer:coarse = false -> nieko nesikompaktino (ranka milzniska, dengia avatara/zonas). Dabar hMobile = useHLayout && innerHeight<640 (zemas landscape ekranas, nepriklauso nuo pointer). (2) Ranka: kompaktiska maza persidengianti apacioj (handW 48), palietus -> handExpanded didele perziura (Hearthstone tap-to-expand). (3) Artefaktai+reakcijos SUJUNGTI i VIENA eile per puse (nebe 2 atskiros); nowrap. Tavo art/react+avataras dabar telpa virs mazos rankos. tsc svarus." > commit403.log 2>&1
echo === Push ===
git push >> commit403.log 2>&1
type commit403.log
echo.
echo ============= BAIGTA (H v3). =============
