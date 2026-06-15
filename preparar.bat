@echo off
REM ============================================================
REM  preparar.bat - roda UMA vez (apos clonar ou atualizar o codigo).
REM  Instala dependencias, aplica migracoes, faz seed e builda tudo.
REM  Nao precisa de admin.
REM ============================================================
cd /d "%~dp0"

echo === [1/5] Servidor: dependencias ===
cd server
call npm install || goto erro

echo === [2/5] Servidor: Prisma (client + migracoes + seed) ===
call npx prisma generate || goto erro
call npx prisma migrate deploy || goto erro
call npm run seed || goto erro

echo === [3/5] Servidor: build ===
call npm run build || goto erro
cd ..

echo === [4/5] App: dependencias ===
cd app
call npm install || goto erro

echo === [5/5] App: build ===
call npm run build || goto erro
cd ..

echo.
echo ============================================================
echo  Pronto! Agora rode  iniciar.bat  para subir o sistema.
echo  (opcional) rode  instalar-autostart.bat  para subir sozinho ao ligar o PC.
echo ============================================================
pause
exit /b 0

:erro
echo.
echo *** Falha em alguma etapa. Verifique a mensagem acima. ***
pause
exit /b 1
