@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/DigitalPvP.tsx src/components/digital/tournament/TournamentScreen.tsx src/components/digital/ui/desktop-ui.css src/components/digital/ui/deskTokens.ts src/components/digital/ranked/RankedClient.tsx src/components/digital/MoreScreen.tsx src/components/digital/progression/DailyQuestsScreen.tsx src/app/digital/layout.tsx src/components/digital/DigitalPvE.tsx src/locales/lt/battle.json src/locales/en/battle.json src/lib/version.ts git-commit774.bat
git commit -m "774: bendras desktop puslapio remas (meniu perziuros 2 etapas). Vienas turinio plotis visiems ekranams (1760, buvo 1440 arba 1760 - perjungiant skiltis turinys sokinejo); virsutine juosta su valiutomis ir pranesimais desktop rodoma ir Kolekcijoje bei Drauguose; Kova su DI ir Reitingas prasideda toje pacioje vietoje, Reitingo turinys iskart po antraste (be tuscio tarpo); Daugiau ir Uzduotys uzpildo rema (nebera siauresnio vidinio stulpelio); Kova su DI: vidurinio stulpelio etikete Kovos tipas vietoj antro Varzovas. Kova su DI, Reitingas ir PvP (su turnyru) kompiuteryje nebe pilno ekrano: turi sonini meniu ir virsutine juosta kaip visi ekranai, meniu paryskinta Pradzia. Telefono isdestymas nekeistas (ten sie ekranai lieka pilno ekrano). APP_VERSION 774" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit774.log 2>&1
