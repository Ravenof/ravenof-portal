@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/game/cinematics.ts src/components/tutorial/RavenofCinematicOverlay.tsx git-commit287.bat
git commit -m "fix(cinematics): Legendiniu summon video daznai 'skip'indavo i poster. 4 priezastys pataisytos: (1) preloadCinematicVideos sukurdavo <video> be referencijos -> narsykle GC'ina ir nutraukia parsisiuntima; dabar laikom _preloadEls referencijas (cap 6). (2) preload visada eme webm, bet Safari/iOS groja mp4 -> collectDeckCinematicVideos dabar parenka pagal canPlayWebm() (webm Chrome, mp4 Safari) -> preload'inam ta pati faila, kuri overlay naudos. (3) START_TIMEOUT_MS 2600->7000 (saltam tinklui reikia laiko pradeti groti, kitaip krenta i poster). (4) overlay efekte pasalintas perteklinis v.load() - autoPlay+preload jau krauna, load() resetindavo elementa ir krautu is naujo prarandant cache/preload heads-up. tsc svarus."
git push
) > commit287.log 2>&1
