$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectDir
function Invoke-Checked {
  param([string]$Program, [string[]]$Arguments)
  & $Program @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Falha em $Program; código $LASTEXITCODE." }
}
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  $dockerCandidate = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'
  if (Test-Path -LiteralPath $dockerCandidate) { $env:PATH = "$(Split-Path $dockerCandidate);$env:PATH" }
}
$serverVersion = & docker info --format '{{.ServerVersion}}' 2>$null
if ($LASTEXITCODE -ne 0 -or ($serverVersion -join '').Trim() -notmatch '^\d+\.\d+\.\d+') {
  throw 'Docker Engine indisponível. Abra o Docker Desktop e aguarde a inicialização.'
}
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  $bundled = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
  if (Test-Path -LiteralPath $bundled) {
    Set-Alias pnpm $bundled
    $bundledNodeDir = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
    $env:PATH = "$bundledNodeDir;$env:PATH"
  }
  else { throw 'Instale Node.js 24 e pnpm 11.19.0 para preparar o Supabase local.' }
}
Invoke-Checked 'pnpm' @('install','--frozen-lockfile')
Invoke-Checked 'pnpm' @('local:prepare')
Write-Host 'Preparando os containers do Supabase; o primeiro uso baixa as imagens.'
& pnpm local:start *> .local/supabase-start.log
if ($LASTEXITCODE -ne 0) { throw 'Falha no Supabase local. Consulte .local/supabase-start.log (pode conter credenciais; não compartilhe).' }
# Apply only pending migrations; never reset an existing developer database here.
Invoke-Checked 'pnpm' @('exec','supabase','migration','up','--local')
$statusJson = & pnpm exec supabase status -o json
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível consultar o Supabase local.' }
[IO.File]::WriteAllText((Join-Path $projectDir '.local/supabase-status.json'), ($statusJson -join "`n"))
Invoke-Checked 'pnpm' @('local:bootstrap')
Invoke-Checked 'pnpm' @('typecheck')
Invoke-Checked 'pnpm' @('lint')
Invoke-Checked 'pnpm' @('test')
Invoke-Checked 'docker' @('compose','--env-file','deploy/.env','-f','deploy/docker-compose.yml','-f','deploy/docker-compose.local.yml','up','-d','--build','--wait','--wait-timeout','180')
Invoke-Checked 'pnpm' @('smoke:worker')
Write-Host 'Aplicação local: http://localhost:8080'
Write-Host 'Acesso local: consulte .local/credentials.json; não compartilhe esse arquivo.'
