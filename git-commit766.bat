@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/game/fxStage.ts src/components/tutorial/TutorialGame.tsx src/lib/version.ts git-commit766.bat
git commit -m "766: FX v4 zaidime - (1) visi vieno taikinio skrydziai i kortas (zala, statusu uzdejimas, gydymas, sustiprinimas) dabar groja pilna choreografija: uztaisymas ant saltinio, skrydis, smugis, pasekmes ant kortos (fxStage.fly nukreipia i playStrike; hitAt gerbiamas - startas atidedamas arba trumpinamas); ledo luitas, antspaudas ir kupolas islieka; (2) AoE zala ir AoE gydymas - nauja zonos choreografija per paveiktu padaru eile (ugnies audra, puga, grandininis zaibas, nuodu rukas, tustumos gniauztai, sielu pjutis, sviesos palaima, gyvybes banga), kiekvienai pusei atskirai, be atitikmens lieka senoji banga; (3) prakeiksmas vienam padarui - plysys, nagai ir didesnis besijuokiantis demonas; kitoms zonoms esamas demonas. Jungiklis fxV4(false) grazina v3. Kode jau yra, bet dar neprijungta: nauja reakcijos grandine (playReaction) ir nuolatiniai statusai (playStatus). APP_VERSION 766" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit766.log 2>&1
