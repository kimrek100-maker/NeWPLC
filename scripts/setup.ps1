$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
py -3.12 -m venv .venv
if ($LASTEXITCODE) { throw 'Installare Python 3.12' }
& .\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
if ($LASTEXITCODE) { throw 'Installazione Python fallita' }
npm.cmd ci --ignore-scripts
if ($LASTEXITCODE) { throw 'Installazione npm fallita' }
node node_modules/electron/install.js
if ($LASTEXITCODE) { throw 'Installazione Electron fallita' }
npm.cmd run build
if ($LASTEXITCODE) { throw 'Build frontend fallita' }
Write-Host 'Pronto: npm run desktop. Per AI: ollama pull qwen2.5-coder:7b'
