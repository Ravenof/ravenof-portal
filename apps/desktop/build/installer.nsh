; ── Ravenof NSIS papildymas (electron-builder nsis.include) ──────────────────
; Problema pas testerius: "Ravenof cannot be closed" + "Error opening file for writing"
; (zaidimas dar sukasi fone arba diegiama i Program Files be admin teisiu).
; customInit vykdomas pries diegima: tyliai uzbaigiam visus Ravenof.exe procesus.
!macro customInit
  nsExec::ExecToLog 'taskkill /F /IM Ravenof.exe /T'
  Sleep 800
!macroend

!macro customUnInit
  nsExec::ExecToLog 'taskkill /F /IM Ravenof.exe /T'
  Sleep 500
!macroend
