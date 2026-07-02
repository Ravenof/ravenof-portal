@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/digital/ui/HubKit.tsx src/components/digital/DigitalHub.tsx
git commit -m "fix(ui): rezimu mygtukai perdaryti grynu CSS (oktagono clip-path + spalvotas remelis + fi-* ikonos) - visada vienodo aukscio, astrus krastai bet kokiam DPI, jokiu iskirpimo artefaktu; pasirinktam glow + raudonas deimantas. HubMode: label/sub/iconName/accent vietoj img. Bonus fix: home quick-action korteles rode i neegzistuojancius card-*.webp (ui3 turi qa-*.webp) - del to dingo 4 korteliu tinklelis po hero. tsc svarus"
git push
git log -1 --oneline
) > commit327.log 2>&1
