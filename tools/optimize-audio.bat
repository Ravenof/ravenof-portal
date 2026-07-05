@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"
REM ============================================================
REM  Ravenof - garso optimizacija (ffmpeg)
REM  Voice lines -> mono MP3 96 kbps (2-3 s klipas ~20-40 KB).
REM  Reikia ffmpeg PATH'e: https://www.gyan.dev/ffmpeg/builds/
REM
REM  Naudojimas:
REM   1) Idek originalius garsus i  tools\audio-in\
REM   2) Paleisk si faila
REM   3) Optimizuoti MP3 atsiras  tools\audio-out\  -> ikelk per admin
REM ============================================================
where ffmpeg >nul 2>&1 || ( echo [X] ffmpeg nerastas PATH. Idiek ir bandyk vel. & pause & exit /b 1 )
if not exist "audio-in"  mkdir "audio-in"
if not exist "audio-out" mkdir "audio-out"

echo Idek source garsus i  tools\audio-in\  ir spausk bet koki klavisa...
pause >nul

set /a count=0
for %%F in (audio-in\*.mp3 audio-in\*.wav audio-in\*.m4a audio-in\*.ogg audio-in\*.aac audio-in\*.flac) do (
  echo   Konvertuoju: %%~nxF
  ffmpeg -y -i "%%F" -ac 1 -c:a libmp3lame -b:a 96k "audio-out\%%~nF.mp3" >nul 2>&1
  set /a count+=1
)

echo.
echo ============================================================
echo  Baigta. !count! failu -> tools\audio-out\ (mono MP3 96 kbps).
echo  Muzikai (ilgi takeliai) naudok atskira nustatyma: -ac 2 -b:a 128k
echo  ir laikyk repo public/ (Vercel CDN), ne Supabase.
echo ============================================================
pause
