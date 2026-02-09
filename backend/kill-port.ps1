# PowerShell script to kill process on port 5000
# Run this script: .\kill-port.ps1

$port = 5000
Write-Host "🔍 Finding process using port $port..." -ForegroundColor Yellow

# Find process using the port
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | 
    Select-Object -ExpandProperty OwningProcess -First 1

if ($process) {
    $processInfo = Get-Process -Id $process -ErrorAction SilentlyContinue
    if ($processInfo) {
        Write-Host "📌 Found process: $($processInfo.ProcessName) (PID: $process)" -ForegroundColor Cyan
        Write-Host "   Path: $($processInfo.Path)" -ForegroundColor Gray
        
        # Try to stop the process
        try {
            Stop-Process -Id $process -Force -ErrorAction Stop
            Write-Host "✅ Successfully killed process $process" -ForegroundColor Green
            Write-Host "   Port $port is now free!" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to kill process: $_" -ForegroundColor Red
            Write-Host "   You may need to run PowerShell as Administrator" -ForegroundColor Yellow
            Write-Host "   Or manually kill it from Task Manager" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  Process $process not found (may have already exited)" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ Port $port is free - no process found!" -ForegroundColor Green
}

# Wait a moment
Start-Sleep -Seconds 1

# Verify port is free
$stillInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if (-not $stillInUse) {
    Write-Host "✅ Port $port is confirmed free!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Port $port is still in use" -ForegroundColor Yellow
}
