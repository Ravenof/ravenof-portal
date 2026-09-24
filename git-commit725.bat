@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/game/impactProfiles.ts src/lib/game/timing.ts src/components/tutorial/BattleFxLayer.tsx src/components/tutorial/TutorialGame.tsx scripts/simulate-game-feel.ts src/lib/version.ts git-commit725.bat
git commit -m "725: Smugio efektai pagal zalos svori (game-feel faze 10) - nauja ZERO pakopa (0 zalos: pilkas dumu/dulkiu puff be blyksnio), CHIP kelios ziezirbos, HIT ziezirbos+ziedas, HEAVY ugnies kamuolys+dvigubas ziedas+spinduliai, DEVASTATING/LETHAL sprogimas su soko ziedu, skeveldromis, ekrano blyksniu ir dumais; IMPACT_FX lentele timing.ts, impactBurst API burtams/reakcijoms; medium kokybe be sunkiu daliu; game:test:feel 180 patikru" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit725.log 2>&1
