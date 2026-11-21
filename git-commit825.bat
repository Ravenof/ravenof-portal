@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/version.ts src/lib/game/types.ts src/lib/game/effectEngine.ts src/lib/tutorial/engine.ts supabase/migrations/20261122_card_fixes_elys_pragaro_liepsna.sql git-commit825.bat
git commit -m "825: kortu pataisos - Elys Matviga atstato pilnas gyvybes, Pragaro Liepsna palieka visus su 1 gyvybe (naujas damage laukas leaveHp); DB tekstai pagal tikras kortas (Magmos sirdis, Kalnu trolis, Minotauras, Apvaizda); Demoniska izvalga rodo savo kalade, Laivo apskaita - kainos grindys 100, Druzas Kirvarza brangina prieso padarus +100, Kapitono Paslaptis +200 tik be padaru, Kojos spastai svaigina tik iskviesta padara su Sprintu; migracija 20261122" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit825.log 2>&1
