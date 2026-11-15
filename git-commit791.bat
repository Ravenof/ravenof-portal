@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/tutorial/ai/aiMaster.ts src/lib/tutorial/ai/aiEngine.ts src/lib/game/botMatchLog.ts src/lib/version.ts scripts/simulate-ai-pass.ts package.json git-commit791.bat
git commit -m "791: DI nebepraleidzia progu - kai paieskai pritruksta laiko, tuscias planas nebereiskia baigti ejima (likusius ejimo veiksmus renka greedy), o kai pilna paieska siulo baigti ejima, saugiklis dar patikrina nemokamas atakas i veida, pelningus prasikeitimus, cempiono gebejima ir iperkamus padarus; i kovu zurnala irasoma paieskos statistika; nauji testai game:test:aipass" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2pquWqjVVw7HiXJktG"
git push
git log -1 --oneline
) > commit791.log 2>&1
