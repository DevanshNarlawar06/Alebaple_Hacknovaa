# Starts the SachVerify API so a phone on the same Wi-Fi can reach it.
# (The normal command binds to 127.0.0.1, which only the computer itself can use.)
#
#   .\start-backend.ps1
#
$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
  Write-Host "Could not find $python. Create the Python environment first (see the main README)." -ForegroundColor Red
  exit 1
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" -and $_.InterfaceAlias -notmatch "Loopback|vEthernet|WSL|VirtualBox|VMware" } |
  Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "SachVerify API for the phone app" -ForegroundColor Cyan
if ($ip) { Write-Host "  On your phone, set the server address to:  http://${ip}:8000" }
Write-Host "  (Settings tab > Server address > Save and test connection)"
Write-Host "  If Windows asks, allow Python through the firewall on Private networks."
Write-Host ""

Set-Location $root
$env:PYTHONIOENCODING = "utf-8"
$env:HF_HUB_DISABLE_SYMLINKS_WARNING = "1"
& $python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
