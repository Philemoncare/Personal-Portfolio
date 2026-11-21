# One-time local setup: store the GitHub OAuth client secret and reload the API.
# The secret is read with a masked prompt; it is never echoed and never passed
# as a command-line argument (so it cannot end up in shell history).
#
# Usage:  powershell -ExecutionPolicy Bypass -File tools\set-github-secret.ps1

$ErrorActionPreference = "Stop"

$backend = Join-Path $PSScriptRoot "..\backend"
$envFile = Join-Path $backend ".env"
$python = Join-Path $backend ".venv\Scripts\python.exe"

if (-not (Test-Path $envFile)) { throw "backend/.env not found at $envFile" }
if (-not (Test-Path $python)) { throw "backend virtualenv not found at $python" }

$secure = Read-Host "Paste the GitHub OAuth client secret (input is hidden)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $secret = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr).Trim()
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ($secret.Length -lt 20) { throw "That value is too short to be a GitHub client secret." }
if ($secret -match "\s") { throw "The secret must not contain spaces or line breaks." }

# Rewrite only the one line; keep every other setting untouched, write UTF-8
# without a BOM so python-dotenv reads the first key correctly.
$lines = [IO.File]::ReadAllLines($envFile)
$found = $false
$updated = foreach ($line in $lines) {
    if ($line -match '^\s*GITHUB_CLIENT_SECRET=') {
        $found = $true
        "GITHUB_CLIENT_SECRET=$secret"
    }
    else { $line }
}
if (-not $found) { $updated = @($updated) + "GITHUB_CLIENT_SECRET=$secret" }

[IO.File]::WriteAllText(
    $envFile,
    (($updated -join "`n") + "`n"),
    (New-Object System.Text.UTF8Encoding($false))
)
Remove-Variable secret

Write-Host "Secret stored in backend/.env (not echoed, not committed)."

# Restart the local API so the new environment is loaded.
Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
    Where-Object { $_.CommandLine -like "*uvicorn*app.main:app*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

$log = Join-Path $env:TEMP "phill-api.log"
$err = Join-Path $env:TEMP "phill-api.err.log"
Start-Process -FilePath $python `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000" `
    -WorkingDirectory $backend `
    -RedirectStandardOutput $log -RedirectStandardError $err `
    -WindowStyle Hidden | Out-Null

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health/live" -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    }
    catch { }
}

if (-not $ready) { throw "The API did not become healthy. Check $err" }

& $python -c "from app.core.config import settings as s; print('github_configured =', s.github_configured); print('redirect_uri =', s.github_redirect_uri); print('scopes =', s.github_scopes); print('public_site_url =', s.frontend_public_url)"

Write-Host ""
Write-Host "API restarted on http://127.0.0.1:8000"
Write-Host "Open http://127.0.0.1:5173/admin/integrations/github and click Connect GitHub."
