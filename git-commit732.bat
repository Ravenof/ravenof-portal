@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/onboarding/StarterDeckOnboarding.tsx src/lib/version.ts git-commit732.bat
git commit -m "732: Onboarding 1 zingsnis PERDARYTAS (ne lopytas): virsutine juosta viena eile (wordmark / pavadinimas / LT+zingsnis), landscape - kaire karusele + desine info skydelis su CTA ir Apziureti kalade (portrete vienas po kito), dezutes dydis is zonos aukscio/plocio, zemuose ekranuose kompaktiskas rezimas (be paantrastes/ivado/veduokles) - viskas telpa be slinkimo 360px auksio landscape telefone" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit732.log 2>&1
