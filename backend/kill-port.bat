@echo off
REM Batch script to kill process on port 5000
REM Run this script: kill-port.bat

echo 🔍 Finding process using port 5000...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    set PID=%%a
    echo 📌 Found process with PID: %%a
    echo    Attempting to kill process...
    taskkill /PID %%a /F
    if errorlevel 1 (
        echo ❌ Failed to kill process. You may need to run as Administrator.
        echo    Or manually kill it from Task Manager (Ctrl+Shift+Esc)
    ) else (
        echo ✅ Successfully killed process %%a
        echo    Port 5000 is now free!
    )
    goto :done
)

echo ✅ Port 5000 is free - no process found!
:done
timeout /t 2 /nobreak >nul
