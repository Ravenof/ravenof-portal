@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/offline/offlineFetch.ts src/lib/offline/mutations.ts src/lib/digital/screenCache.ts src/components/digital/DigitalCollection.tsx src/components/digital/DigitalMyDecks.tsx src/components/digital/ShopModal.tsx src/components/digital/CollectionPageFlip.tsx apps/digital/src/screens/DecksScreen.tsx src/lib/version.ts git-commit843.bat git-commit844.bat
git commit -m "844: greitesnis ekranu atsidarymas - katalogo uzklausos (kortos, frakcijos, retumai, pakai, vertimai) is keso su atnaujinimu fone, auth getUser 5 min is keso, kolekcija / kalades / parduotuve atsimena paskutini vaizda ir atsinaujina fone; kopijos ismetamos po pirkimu, paku, kaladziu keitimo" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2p52WXEcLzrz9fWNLQ"
git push
git log -1 --oneline
) > commit844.log 2>&1
