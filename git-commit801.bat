@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add android/app/build.gradle android/settings.gradle android/media_pack/build.gradle android/.gitignore build-aab.bat GOOGLE-PLAY-AAB.md git-commit801.bat
git commit -m "801: Google Play AAB build - build-aab.bat, release pasirasymas per android/keystore.properties, install-time asset pack media_pack (media, cards, sounds, rules), nes bazinis modulis ribojamas 200 MB" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit801.log 2>&1
