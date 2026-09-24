@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/DigitalDeckBuilder.tsx tsconfig.check.scene.json src/lib/version.ts git-commit723.bat
git commit -m "723: Deck builder albumas - kortu pool dabar rodomas kaip Kolekcijos grid (kortu paveikslai, retumo svytejimas, x turima, Neturima pilkai) vietoj vardu saraso; plytelese papildomai kaina, kiek kaladeje (auksinis remas) ir greitas [+]; drag/hover/perziura veikia kaip anksciau" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit723.log 2>&1
