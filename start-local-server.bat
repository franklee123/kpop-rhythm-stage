@echo off
chcp 65001 >nul
echo ====================================================
echo  K-POP Rhythm Stage - Local Preview Server
echo  URL: http://localhost:8080/
echo  (Press Ctrl+C to stop)
echo ====================================================
start "" "http://localhost:8080/"
python -m http.server 8080 --directory "%~dp0public"
if errorlevel 1 (
    echo.
    echo [Hint] Python not found. You can run this project via Eclipse Tomcat / HTTP Preview Server instead.
    pause
)
