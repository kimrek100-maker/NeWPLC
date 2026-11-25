$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
& .\.venv\Scripts\python.exe -m pytest backend/tests
if ($LASTEXITCODE) { throw 'Test falliti' }
npm run test:linter
if ($LASTEXITCODE) { throw 'Test linter falliti' }
& .\.venv\Scripts\python.exe -m PyInstaller --noconfirm --clean --onedir --name studio-backend --paths backend --collect-submodules uvicorn --collect-all lark --collect-all pypdf --distpath build/backend-dist backend/run.py
if ($LASTEXITCODE) { throw 'Packaging backend fallito' }
if (Test-Path build/backend) { Remove-Item build/backend -Recurse -Force }
New-Item -ItemType Directory -Force build/backend | Out-Null
Copy-Item build/backend-dist/studio-backend/* build/backend/ -Recurse -Force
Copy-Item .\backend\studio build/backend/studio -Recurse -Force
Copy-Item .\backend\run.py build/backend/run.py -Force
npm run dist:win
if ($LASTEXITCODE) { throw 'Packaging Electron fallito' }
