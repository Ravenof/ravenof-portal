@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/version.ts src/components/tutorial/TutorialGame.tsx src/components/tutorial2/TutorialDirector.tsx src/components/tutorial2/TutorialOverlay.tsx src/data/tutorialLessons/lessonSeeds.ts src/locales/lt/battle.json src/locales/en/battle.json git-commit779.bat
git commit -m "779: mokymu pataisos (2 dalis). Cempiono gebejimu lange rodykle rodo i pirma gebejima, o ne uzdengia langa; zingsnio metu prideti padarai (Palaiminimas, Paskutinis noras) gauna savo paryskinima ir rodykle; Istrigo mygtukas neberodomas laisvuose uzbaik kova zingsniuose; padaro Kovos suksnio taikiniui - Pasirink taikini (ne burto taikini); 8 pamokoje didesne kalade, kad iskeista korta iskart negriztu; patikslinti 2 ir 6 pamoku tekstai" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit779.log 2>&1
