@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/profile/client.ts src/components/digital/progression/SeasonPathScreen.tsx src/components/digital/progression/LoginRewardsScreen.tsx src/components/digital/ui/RavenofKit.tsx src/app/digital/layout.tsx src/components/digital/tournament/TournamentScreen.tsx src/locales/lt/progression.json src/locales/en/progression.json src/locales/lt/more.json src/locales/en/more.json src/app/digital/pvp2v2/page.tsx src/app/digital/coop/page.tsx src/lib/version.ts git-commit773.bat
git commit -m "773: meniu perziuros klaidu pataisos (1 etapas). Pasiekimu skaicius visur vienodas (matomu kiekis, ne 54 vs 70); prisijungimo dovanu ciklo ilgis tik is serverio (be kieto 31 d.), nenukirptas PASIRINKIMAS; sezono kelias telefone: teisinga busena (Atsiimta vietoj Atlygis paruostas) ir skyriaus pavadinimas nebepalenda po langeliais; kolekcijos filtre Padaro ikona vietoj teksto Pa; atidarius parduotuve paryskinta tik ji; telefone Pradzioje role zenklelis nebeuzlipa ant formato perjungiklio; turnyro pasiruosimo langas tik vykstanciame turnyre aktyviam dalyviui; /digital/pvp2v2 ir /digital/coop nukreipia i pradzia (2v2 atsisakyta). APP_VERSION 773" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit773.log 2>&1
