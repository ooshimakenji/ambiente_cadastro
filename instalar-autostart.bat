@echo off
REM ============================================================
REM  instalar-autostart.bat - cria um atalho na pasta Inicializar
REM  do Windows (nivel de USUARIO, NAO precisa de admin) para o
REM  sistema subir sozinho quando voce loga no PC.
REM  Para desfazer: apague o atalho da pasta shell:startup.
REM ============================================================
set "ALVO=%~dp0iniciar.bat"
set "TRAB=%~dp0"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

powershell -NoProfile -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut(\"%STARTUP%\Ambiental Cadastro.lnk\"); $s.TargetPath=\"%ALVO%\"; $s.WorkingDirectory=\"%TRAB%\"; $s.Description=\"Sobe o ambiental_cadastro ao iniciar\"; $s.Save()"

echo.
echo Atalho criado em:
echo   %STARTUP%\Ambiental Cadastro.lnk
echo.
echo O sistema vai subir sozinho no proximo login do Windows.
echo Para desativar, apague esse atalho (rode: shell:startup).
pause
