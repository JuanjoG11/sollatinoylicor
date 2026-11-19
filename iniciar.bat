@echo off
title Sistema POS - Sol Latino y Licores San Pedro
echo.
echo  =============================================
echo   SISTEMA POS - Sol Latino y Licores San Pedro
echo  =============================================
echo.
echo  Iniciando servidor local...
echo  El sistema se abrira en tu navegador.
echo.
echo  Para cerrar: cierra esta ventana.
echo.

cd /d "%~dp0"
start http://localhost:3000
npx http-server . -p 3000 -c-1 --cors --silent
