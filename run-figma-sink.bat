@echo off
cd /d "%~dp0"
title Ravenof - Figma kortu priemimas
node tools\figma-card-sink.mjs
pause
