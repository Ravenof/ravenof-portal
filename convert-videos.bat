@echo off
REM ══════════════════════════════════════════════════════════════════════════
REM  Avatarų/kinematikų video konvertavimas į WebView draugišką formatą.
REM  PROBLEMA: play ikonėlė dažniausiai = HEVC/H.265 (iPhone įrašai) arba
REM  moov atomas failo gale — Android WebView nedekoduoja / ilgai parsina.
REM  SPRENDIMAS: H.264 (visur palaikomas) + yuv420p + faststart + be garso.
REM  NAUDOJIMAS: įmesk video į aplanką "video-in" šalia šio .bat ir paleisk.
REM  Rezultatai atsiras "video-out" — juos įkelk per admin (pakeisk senus).
REM  Reikia ffmpeg: winget install Gyan.FFmpeg
REM ══════════════════════════════════════════════════════════════════════════
cd /d "%~dp0"
if not exist video-in mkdir video-in
if not exist video-out mkdir video-out
for %%f in (video-in\*.mp4 video-in\*.mov video-in\*.webm video-in\*.m4v) do (
  echo Konvertuojama: %%~nxf
  ffmpeg -y -i "%%f" -an -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 23 -preset medium ^
    -vf "scale='min(480,iw)':-2,fps=24" -movflags +faststart "video-out\%%~nf.mp4"
)
echo.
echo BAIGTA. Failai: video-out\  (ikelk per admin vietoj senu)
pause
