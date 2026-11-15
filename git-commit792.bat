@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/data/tutorialLessons/lessonsEn.ts src/lib/tutorial2/deskText.ts src/components/tutorial2/TutorialDirector.tsx src/components/tutorial2/TutorialHub.tsx src/lib/digital/cosmeticsStore.ts src/locales/lt/common.json src/locales/en/common.json src/lib/version.ts src/components/tutorial/BattleLogList.tsx src/locales/en/battle.json src/locales/en/home.json src/locales/en/settings.json src/locales/en/battleLog.json src/locales/en/statusEffects.json src/components/digital/MoreScreen.tsx src/components/digital/DigitalPvE.tsx git-commit792.bat
git commit -m "792: EN mokymai - visu 8 pamoku tekstai (pavadinimai, Korvo replikos, tikslai, uzuominos) EN rezime rodomi angliskai per LT-EN zodyna lessonsEn.ts (nerasta eilute lieka LT), kompiuteryje - peles variantas; numatytosios nugareles pavadinimas per i18n rakta; EN kalboje ZMK visur pakeista i DMD; Daugiau meniu - vieno stiliaus ikonos ir kompiuteryje nebekartojami nustatymai bei klaidos pranesimas; kovoje su DI rodomi tikri frakciju zenklai" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2roVTLcAdN84CcY8er"
git push
git log -1 --oneline
) > commit792.log 2>&1
