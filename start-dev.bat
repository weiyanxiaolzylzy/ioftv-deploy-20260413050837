@echo off
chcp 65001 >nul
echo ========================================
echo   本地调试启动脚本
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Starting backend server (port 8890)...
start "Server" cmd /c "cd /d %cd%\server && node index.js"

timeout /t 2 /nobreak >nul

echo [2/3] Starting frontend dev server (port 5173)...
start "Frontend" cmd /c "cd /d %cd%\ifc && npm run dev"

timeout /t 3 /nobreak >nul

echo [3/3] Starting Python IFC service (port 8765)...
start "PythonAPI" cmd /c "cd /d %cd% && python app.py"

echo.
echo ========================================
echo   Services started!
echo ========================================
echo.
echo   - Backend:    http://localhost:8890
echo   - Frontend:   http://localhost:5173
echo   - Python API: http://localhost:8765
echo.
echo   Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul

start http://localhost:5173

echo.
echo Press any key to exit this window (servers will keep running)...
pause >nul
