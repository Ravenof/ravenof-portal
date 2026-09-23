@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/tutorial/engine.ts scripts/simulate-combat-target.ts src/lib/version.ts git-commit719.bat
git commit -m "719: reakciju kanonas uzpildytas - trigerio saltinis dabar perduodamas ir zalai zaidejui (puolejas), zuciai (zudikas) ir gydymui (pagydytas padaras); reakcija be AoE taiko ta, kas ja suaktyvino; game:test:combattarget 9 patikros" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit719.log 2>&1
