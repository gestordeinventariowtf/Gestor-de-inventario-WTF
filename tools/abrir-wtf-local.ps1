[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectDir,
    [int]$Port = 5179,
    [int]$HostPort = 8787,
    [switch]$CheckHost,
    [switch]$CheckPorts,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$ProjectDir = [string]$ProjectDir
# cmd.exe puede entregar la ruta con comillas o con una barra final; normalizarla
# antes de llamar a .NET evita el error de caracteres invalidos al hacer doble clic.
$ProjectDir = $ProjectDir.Trim().Trim('"').Trim()
$ProjectDir = $ProjectDir -replace '["'']', ''
$ProjectDir = $ProjectDir.Trim()
if ([string]::IsNullOrWhiteSpace($ProjectDir)) {
    throw "No se recibio la carpeta del proyecto. Ejecute el lanzador desde la carpeta del sistema."
}
$projectPathIsValid = $false
try {
    $projectPathIsValid = Test-Path -LiteralPath $ProjectDir -PathType Container -ErrorAction Stop
} catch {
    $projectPathIsValid = $false
}
if (-not $projectPathIsValid) {
    $fallbackProjectDir = Split-Path -Parent $PSScriptRoot
    if (Test-Path -LiteralPath $fallbackProjectDir -PathType Container) {
        $ProjectDir = $fallbackProjectDir
    } else {
        throw "La carpeta del proyecto no existe o contiene caracteres invalidos: $ProjectDir"
    }
}
$ProjectDir = (Resolve-Path -LiteralPath $ProjectDir).Path
Set-Location -LiteralPath $ProjectDir

Write-Host "WTF Sistema - prueba local" -ForegroundColor Cyan
Write-Host "Carpeta: $ProjectDir"
Write-Host "URL:     http://localhost:$Port/"
Write-Host "Firebase: datos remotos del proyecto configurado; Auth usa localhost como origen." -ForegroundColor Green
Write-Host ""

$firebaseConfigPath = Join-Path $ProjectDir "firebase-config.js"
if (Test-Path -LiteralPath $firebaseConfigPath) {
    $firebaseConfig = Get-Content -LiteralPath $firebaseConfigPath -Raw
    $projectId = [regex]::Match($firebaseConfig, 'projectId:\s*"([^"]+)"').Groups[1].Value
    $authDomain = [regex]::Match($firebaseConfig, 'authDomain:\s*"([^"]+)"').Groups[1].Value
    Write-Host "Firebase projectId: $projectId" -ForegroundColor DarkGray
    Write-Host "Firebase Auth:     $authDomain" -ForegroundColor DarkGray
} else {
    Write-Host "Aviso: no se encontro firebase-config.js." -ForegroundColor Yellow
}

if ($CheckPorts) {
    Write-Host "--- Puertos locales ---" -ForegroundColor Cyan
    foreach ($candidate in @($Port, 5000, 5001, $HostPort) | Sort-Object -Unique) {
        $listener = Get-NetTCPConnection -LocalPort $candidate -State Listen -ErrorAction SilentlyContinue
        if ($listener) {
            Write-Host "Puerto ${candidate}: EN USO (se conserva el proceso existente)." -ForegroundColor Yellow
        } else {
            Write-Host "Puerto ${candidate}: libre." -ForegroundColor DarkGray
        }
    }
    Write-Host "5000/5001 se revisan solamente; no se inicia un emulador de Functions automaticamente." -ForegroundColor DarkGray
}

if ($CheckHost) {
    Write-Host "--- WTF ICG Host ---" -ForegroundColor Cyan
    $healthUrl = "http://127.0.0.1:$HostPort/api/health"
    try {
        $health = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 3
        Write-Host "Host local disponible en $healthUrl" -ForegroundColor Green
        if ($health) { Write-Host ("Respuesta: " + ($health | ConvertTo-Json -Compress)) -ForegroundColor DarkGray }
    } catch {
        Write-Host "Host local no responde en $healthUrl. La web seguira funcionando con Firebase remoto." -ForegroundColor Yellow
    }
}

$existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "El puerto $Port ya esta ocupado. Se abrira la aplicacion existente." -ForegroundColor Yellow
    Start-Process "http://localhost:$Port/"
    Write-Host "Cierra esta ventana cuando termines la prueba."
    return
}

$python = Get-Command py -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command python -ErrorAction SilentlyContinue
}

if (-not $python) {
    Write-Host "No se encontro Python para servir la aplicacion local." -ForegroundColor Red
    Write-Host "Instala Python o inicia manualmente un servidor HTTP en el puerto $Port."
    Read-Host "Presiona Enter para cerrar"
    exit 1
}

$pythonArgs = if ($python.Name -eq "py.exe") {
    "-3 -m http.server $Port --bind 127.0.0.1"
} else {
    "-m http.server $Port --bind 127.0.0.1"
}

Write-Host "Comando ejecutado: $($python.Source) $pythonArgs" -ForegroundColor DarkGray
Write-Host "Firebase Auth se probara desde localhost; no abras index.html directamente." -ForegroundColor Green

$server = Start-Process -FilePath $python.Source `
    -ArgumentList $pythonArgs `
    -WorkingDirectory $ProjectDir `
    -PassThru `
    -WindowStyle Hidden

try {
    $ready = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Milliseconds 250
        if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
            $ready = $true
            break
        }
    }

    if (-not $ready) {
        throw "El servidor no comenzo a escuchar en el puerto $Port."
    }

    if (-not $NoBrowser) { Start-Process "http://localhost:$Port/" }
    Write-Host "Servidor activo. Prueba la aplicacion y Firebase Auth en el navegador." -ForegroundColor Green
    Write-Host "Para detenerlo, cierra esta ventana o presiona Ctrl+C."
    Write-Host ""
    Write-Host "Comprobaciones recomendadas antes de deploy:" -ForegroundColor Cyan
    Write-Host "1. Iniciar sesion con un usuario autorizado."
    Write-Host "2. Abrir los modulos afectados y revisar consola del navegador."
    Write-Host "3. Confirmar lecturas y escrituras en Firestore."
    Write-Host "4. Ejecutar npm.cmd run check en otra ventana."
    Write-Host "5. Si usas el Host, comprobar que responda en http://127.0.0.1:$HostPort/api/health."
    Write-Host "6. No abras index.html directamente: Google/Firebase Auth necesita http://localhost o HTTPS."

    while (-not $server.HasExited) {
        Start-Sleep -Seconds 1
    }
}
finally {
    if ($server -and -not $server.HasExited) {
        Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    }
}
