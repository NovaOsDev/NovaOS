@echo off
title Nova Simulator 0.1
cd /d "%~dp0"
if not exist node_modules (
  echo Nova wird zum ersten Mal eingerichtet...
  echo.
  npm install
  if errorlevel 1 (
    echo.
    echo FEHLER: npm konnte die benoetigten Dateien nicht installieren.
    echo Pruefe, ob Node.js installiert ist und eine Internetverbindung besteht.
    pause
    exit /b 1
  )
)
npm start
