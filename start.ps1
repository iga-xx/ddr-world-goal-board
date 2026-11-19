$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$taskNodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($taskNodeCommand) { $taskNode = $taskNodeCommand.Source }
else { $taskNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $taskNode)) { throw 'Node.js 24 or later is required. Install Node.js, then run again.' }
if (-not (Test-Path -LiteralPath 'dist\index.html')) { throw 'Build is missing. Follow README.md to build the app first.' }
Start-Process 'http://127.0.0.1:5173' -WindowStyle Hidden
& $taskNode scripts/serve.mjs
