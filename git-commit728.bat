@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/game/format.ts src/components/digital/ui/FormatSwitch.tsx supabase/migrations/20260930_classic_format.sql scripts/simulate-combat-target.ts src/components/digital/DigitalHub.tsx src/components/digital/DigitalPvE.tsx src/components/digital/DigitalPvP.tsx src/components/digital/ranked/RankedClient.tsx src/components/tutorial/TutorialGame.tsx src/lib/ranked/client.ts src/lib/tutorial/engine.ts src/locales/en/battle.json src/locales/en/home.json src/locales/lt/battle.json src/locales/lt/home.json tsconfig.check.scene.json src/lib/version.ts git-commit728.bat
git commit -m "728: KLASIKA (be ZMK) kovos formatas - hub'e formato tab'ai ZMK KOVOS / KLASIKA (isimenama rvn-format), PvE/PvP/Reitingas skaito aktyvu formata (chip antrastese); varikliuke GameState.format=classic: ZMK kalades tuscios, zala = bazine, be zmk irasu; kovoje KLASIKA zenklelis vietoj ZMK kaladziu; pvp_matches.format (kambariai ir greita kova filtruojami); Klasikos reitingas ATSKIRAS - ranked_seasons.format, vienas aktyvus sezonas per formata, RPC su p_format (migracija 20260930, PALEISTI PRIES release); game:test:combattarget 12" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit728.log 2>&1
