param(
  [switch]$InstallDeps
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $repoRoot 'pawsitive-mobile'
$backendDir = Join-Path $repoRoot 'backend'
$backendVenvPython = Join-Path $backendDir 'venv\Scripts\python.exe'

if (-not (Test-Path $frontendDir)) {
  throw "Frontend directory not found: $frontendDir"
}

if (-not (Test-Path $backendDir)) {
  throw "Backend directory not found: $backendDir"
}

$pythonCommand = if (Test-Path $backendVenvPython) { $backendVenvPython } else { 'python' }
$backendEnvPath = Join-Path $backendDir '.env'
$frontendEnvPath = Join-Path $frontendDir '.env'

if (-not (Test-Path $backendVenvPython)) {
  Write-Warning "Backend venv not found at $backendVenvPython. Falling back to 'python' from PATH."
}

if (-not (Test-Path $backendEnvPath)) {
  Write-Warning "Missing backend .env at $backendEnvPath"
}

if (-not (Test-Path $frontendEnvPath)) {
  Write-Warning "Missing frontend .env at $frontendEnvPath"
}

$backendInstallStep = ''
if ($InstallDeps) {
  $backendInstallStep = "& '$pythonCommand' -m pip install -r requirements.txt; "
}

$backendCommand = @(
  "Set-Location '$backendDir'"
  '$Host.UI.RawUI.WindowTitle = ''Pawsitive Backend'''
  $backendInstallStep + "& '$pythonCommand' -m uvicorn server:app --app-dir src --host 0.0.0.0 --port 8000"
) -join '; '

$frontendInstallStep = ''
if ($InstallDeps) {
  $frontendInstallStep = 'npm install; '
}

$frontendCommand = @(
  "Set-Location '$frontendDir'"
  '$Host.UI.RawUI.WindowTitle = ''Pawsitive Frontend'''
  $frontendInstallStep + 'npm start'
) -join '; '

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-ExecutionPolicy', 'Bypass',
  '-Command', $backendCommand
)

Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-ExecutionPolicy', 'Bypass',
  '-Command', $frontendCommand
)

Write-Host 'Started backend and frontend in separate PowerShell windows.'
if ($InstallDeps) {
  Write-Host 'Dependency install steps are included for both services.'
}
