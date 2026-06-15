@echo off
REM ============================================================
REM  iniciar.bat - sobe o sistema (API + frontend) numa porta so.
REM  Reinicia automaticamente se o processo cair.
REM  Pre-requisito: rodar preparar.bat antes (builds prontos).
REM  Para encerrar: feche esta janela.
REM ============================================================
cd /d "%~dp0server"

echo Aplicando migracoes do banco...
call npx prisma migrate deploy

:loop
echo.
echo === Iniciando servidor (porta 3001) — %date% %time% ===
node --env-file=.env dist/index.js
echo.
echo Servidor parou. Reiniciando em 5s... (feche a janela para encerrar)
timeout /t 5 /nobreak >nul
goto loop
