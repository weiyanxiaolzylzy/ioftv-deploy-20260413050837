$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $Root "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$FrontendPort = 8081
$BackendPort = 8890
$IfcPort = 5173
$PythonPort = 8765

function Stop-PortProcess {
    param([int]$Port)

    $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($connection in $connections) {
        $pidToStop = $connection.OwningProcess
        if ($pidToStop -and $pidToStop -ne $PID) {
            Stop-Process -Id $pidToStop -Force -ErrorAction SilentlyContinue
        }
    }
}

function Start-DevProcess {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$Command,
        [string]$LogName
    )

    $logPath = Join-Path $LogDir $LogName
    $cmd = "cd /d `"$WorkingDirectory`" && $Command > `"$logPath`" 2>&1"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $cmd -WindowStyle Hidden | Out-Null
    Write-Host ("Started {0}, log: {1}" -f $Name, $logPath)
}

Write-Host "========================================"
Write-Host "  IOFTV Local Dev Starter"
Write-Host "========================================"
Write-Host ("Project root: {0}" -f $Root)
Write-Host ""

if (-not (Test-Path (Join-Path $Root "package.json"))) {
    throw "package.json not found. Put this script in project root."
}

Write-Host "Stopping old processes on ports 8081, 8890, 5173, 8765..."
@($FrontendPort, $BackendPort, $IfcPort, $PythonPort) | ForEach-Object { Stop-PortProcess $_ }
Start-Sleep -Seconds 1

Start-DevProcess `
    -Name "Node backend :$BackendPort" `
    -WorkingDirectory (Join-Path $Root "server") `
    -Command "set PORT=$BackendPort&& set PYTHON_API_PORT=$PythonPort&& npm start" `
    -LogName "backend-8890.log"

Start-Sleep -Seconds 2

Start-DevProcess `
    -Name "Python IFC :$PythonPort" `
    -WorkingDirectory $Root `
    -Command "python app.py" `
    -LogName "python-8765.log"

Start-Sleep -Seconds 2

Start-DevProcess `
    -Name "IFC viewer :$IfcPort" `
    -WorkingDirectory (Join-Path $Root "ifc") `
    -Command "npm run dev -- --host 0.0.0.0 --port $IfcPort" `
    -LogName "ifc-5173.log"

Start-Sleep -Seconds 2

Start-DevProcess `
    -Name "Main frontend :$FrontendPort" `
    -WorkingDirectory $Root `
    -Command "npm run serve -- --host 0.0.0.0 --port $FrontendPort" `
    -LogName "frontend-8081.log"

Write-Host ""
Write-Host "Waiting for services..."
Start-Sleep -Seconds 8

$urls = @(
    "http://localhost:$FrontendPort/",
    "http://localhost:$BackendPort/health",
    "http://localhost:$IfcPort/",
    "http://localhost:$PythonPort/health"
)

foreach ($url in $urls) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        Write-Host ("OK   {0} [{1}]" -f $url, $response.StatusCode)
    } catch {
        Write-Host ("WAIT {0}" -f $url)
    }
}

Write-Host ""
Write-Host ("Main page: http://localhost:{0}/" -f $FrontendPort)
Write-Host ("Logs dir:  {0}" -f $LogDir)
Start-Process ("http://localhost:{0}/" -f $FrontendPort) | Out-Null
