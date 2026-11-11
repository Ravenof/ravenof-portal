@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git rm -r -q --ignore-unmatch public/digital/fx
if exist "public\digital\fx\blast.webp" del /f /q "public\digital\fx\blast.webp"
if exist "public\digital\fx" rmdir "public\digital\fx"
git add src/lib/game/fxStage.ts src/components/tutorial/ReactionChainLayer.tsx src/components/tutorial/TutorialGame.tsx src/app/dev/fx/page.tsx src/lib/version.ts scripts/simulate-fx-aoe.ts scripts/sweep-cards.ts scripts/sweep-cases.ts package.json git-commit769.bat
git commit -m "769: (1) REAKCIJA - pilna nauja grandine: ReactionChainLayer lieka laiko, vartu ir garsu seimininkas, bet grandine piesia fxStage.playReaction tomis paciomis faziu trukmemis (antgalis su grandimis, dvi kilpos aplink korta, susiverzimas, grandine laikosi per kortos parodyma ir sutruksta su kontrsmugiu efekto fazeje), seka taikinio pozicija; reduced-motion ir be fxStage - ankstesnis piesimas; atskiri akcentai is 767 nebereikalingi. (2) ISIMTAS atmestas teksturu (flipbook) pilotas: fxStage book/stamp variklis ir trys bandomieji efektai, /dev/fx piloto blokas, public/digital/fx teksturos. (3) testas game:test:fxaoe (15) - variklio FX zymes AoE efektams. APP_VERSION 769" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit769.log 2>&1
