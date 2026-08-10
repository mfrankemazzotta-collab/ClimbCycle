# ====================================================
#  subir.ps1 -- verificar y subir a GitHub, en un paso
#  ClimbCycle
#
#  Corre los tests ANTES de commitear. Si algo esta roto, no sube nada:
#  es mas barato enterarse aca que en el CI, y mucho mas que en produccion.
#
#  Uso:
#    .\subir.ps1                          # mensaje automatico con la fecha
#    .\subir.ps1 "Arreglo el timer"       # mensaje propio
#    .\subir.ps1 -SinTests                # saltear la verificacion (no recomendado)
#
#  Si PowerShell se queja de permisos la primera vez:
#    Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
#
#  ---------------------------------------------------------------
#  NOTA SOBRE LA CODIFICACION -- no la cambies sin leer esto.
#
#  Este archivo es ASCII PURO a proposito: sin tildes, sin enies, sin
#  caracteres de dibujo de lineas. Windows PowerShell 5.1 (el que viene
#  con Windows) lee los .ps1 como ANSI si no tienen BOM, asi que un
#  guion largo o una tilde se convierten en basura tipo "a-" y rompen
#  el PARSER: el script no arranca y los errores que tira apuntan a
#  lugares que no tienen nada que ver.
#
#  Paso de verdad: la version anterior usaba "-" (U+2500) para dibujar
#  separadores y fallaba con "Token inesperado en la expresion" en la
#  linea 32. Con ASCII puro el problema no puede volver, sin importar
#  con que editor se guarde el archivo.
#  ---------------------------------------------------------------
# ====================================================

param(
  [Parameter(Position = 0)]
  [string]$Mensaje = "",

  [switch]$SinTests
)

$ErrorActionPreference = "Stop"

# Trabajar siempre en la carpeta del script, sin importar desde donde se llame.
Set-Location -Path $PSScriptRoot

function Titulo($texto) {
  Write-Host ""
  Write-Host ("== " + $texto + " " + ("=" * [Math]::Max(0, 56 - $texto.Length))) -ForegroundColor Cyan
}

# -- 0. Lock huerfano de git --------------------------
# git crea .git/index.lock mientras escribe el indice y lo borra al terminar.
# Si un proceso muere a mitad -o lo toca una herramienta que no puede
# limpiarlo- el archivo queda y TODO comando que escriba falla con
# "Another git process seems to be running".
#
# Solo se borra si esta VACIO y con mas de 60 segundos: un lock recien
# creado o con contenido puede ser de un git que esta corriendo de verdad,
# y ahi borrarlo si corromperia el indice.
$lock = Join-Path $PSScriptRoot ".git\index.lock"
if (Test-Path $lock) {
  $f = Get-Item $lock -Force
  $edad = (Get-Date) - $f.LastWriteTime
  if ($f.Length -eq 0 -and $edad.TotalSeconds -gt 60) {
    Remove-Item $lock -Force
    Write-Host "  (limpie un index.lock huerfano de $([int]$edad.TotalSeconds)s)" -ForegroundColor DarkGray
  } else {
    Write-Host ""
    Write-Host "  [X] Hay un .git\index.lock activo (tamano $($f.Length) B, $([int]$edad.TotalSeconds)s)." -ForegroundColor Red
    Write-Host "      Puede haber otro git corriendo. Si estas seguro de que no, borralo:" -ForegroundColor Gray
    Write-Host "      Remove-Item '$lock' -Force" -ForegroundColor Gray
    exit 1
  }
}

# -- 1. Hay algo para subir? --------------------------
Titulo "Cambios"
$cambios = git status --porcelain
if (-not $cambios) {
  Write-Host "  No hay nada que subir: el repo esta limpio." -ForegroundColor Yellow
  exit 0
}
$cantidad = ($cambios | Measure-Object -Line).Lines
Write-Host "  $cantidad archivo(s) modificado(s):" -ForegroundColor Gray
$cambios | Select-Object -First 15 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
if ($cantidad -gt 15) { Write-Host "    ... y $($cantidad - 15) mas" -ForegroundColor DarkGray }

# -- 2. Tests -----------------------------------------
# No necesitan 'npm install': el harness corre con Node pelado.
if (-not $SinTests) {
  Titulo "Tests"
  npm test --silent 2>&1 | Select-Object -Last 4
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  [X] Los tests fallaron. NO se subio nada." -ForegroundColor Red
    Write-Host "      Corre 'npm test' para ver el detalle completo." -ForegroundColor Gray
    exit 1
  }
  Write-Host "  [OK] Todo en verde" -ForegroundColor Green
} else {
  Write-Host ""
  Write-Host "  [!] Tests salteados (-SinTests)" -ForegroundColor Yellow
}

# -- 3. Commit ----------------------------------------
Titulo "Commit"
if (-not $Mensaje) {
  $Mensaje = "Cambios del " + (Get-Date -Format "dd/MM/yyyy HH:mm")
}
git add -A
git commit -m $Mensaje | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "  [X] Fallo el commit." -ForegroundColor Red
  exit 1
}
Write-Host "  [OK] $Mensaje" -ForegroundColor Green

# -- 4. Push ------------------------------------------
# La primera vez la rama no tiene upstream; -u lo configura y en los
# push siguientes ya no hace falta.
Titulo "Push"
$rama = git branch --show-current
$tieneUpstream = git rev-parse --abbrev-ref "$rama@{upstream}" 2>$null

if ($tieneUpstream) { git push }
else {
  Write-Host "  (primera vez en esta rama: configurando upstream)" -ForegroundColor DarkGray
  git push --set-upstream origin $rama
}

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "  [X] Fallo el push. El commit quedo hecho localmente." -ForegroundColor Red
  Write-Host "      Proba 'git pull --rebase' y volve a correr el script." -ForegroundColor Gray
  exit 1
}

Write-Host ""
Write-Host "  [OK] Subido a GitHub" -ForegroundColor Green
Write-Host "       CI: https://github.com/mfrankemazzotta-collab/ClimbCycle/actions" -ForegroundColor DarkGray
Write-Host ""
