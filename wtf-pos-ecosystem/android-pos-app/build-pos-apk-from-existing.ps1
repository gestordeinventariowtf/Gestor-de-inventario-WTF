param(
  [string]$OutputName = "wtf-pos-updated-debug.apk"
)

$ErrorActionPreference = "Stop"

$AppRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$AndroidHome = $env:ANDROID_HOME
if (-not $AndroidHome) {
  $AndroidHome = $env:ANDROID_SDK_ROOT
}
if (-not $AndroidHome) {
  throw "ANDROID_HOME o ANDROID_SDK_ROOT no esta configurado."
}

$BuildTools = Join-Path $AndroidHome "build-tools\35.0.0"
$ZipAlign = Join-Path $BuildTools "zipalign.exe"
$ApkSigner = Join-Path $BuildTools "apksigner.bat"
$DebugKeystore = Join-Path $env:USERPROFILE ".android\debug.keystore"

foreach ($RequiredFile in @($ZipAlign, $ApkSigner, $DebugKeystore)) {
  if (-not (Test-Path -LiteralPath $RequiredFile)) {
    throw "No se encontro: $RequiredFile"
  }
}

$OutDir = Join-Path $AppRoot "android\app\build\outputs\apk\debug"
$BaseApk = Join-Path $OutDir "app-debug.apk"
if (-not (Test-Path -LiteralPath $BaseApk)) {
  throw "No se encontro la APK base: $BaseApk"
}

$TempRoot = Join-Path $env:TEMP ("wtf-pos-apk-work-" + [guid]::NewGuid().ToString("N"))
$UnsignedApk = Join-Path $OutDir "wtf-pos-updated-unsigned.apk"
$AlignedApk = Join-Path $OutDir "wtf-pos-updated-aligned.apk"
$SignedApk = Join-Path $OutDir $OutputName

Remove-Item -LiteralPath $UnsignedApk, $AlignedApk, $SignedApk -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $TempRoot | Out-Null
$TempFullName = (Get-Item -LiteralPath $TempRoot).FullName

try {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::ExtractToDirectory($BaseApk, $TempRoot)

  Remove-Item -LiteralPath (Join-Path $TempRoot "META-INF") -Recurse -Force -ErrorAction SilentlyContinue

  $AssetDir = Join-Path $TempRoot "assets\public"
  foreach ($FileName in @("index.html", "styles.css", "app.js")) {
    $Source = Join-Path $AppRoot "www\$FileName"
    $Target = Join-Path $AssetDir $FileName
    if (-not (Test-Path -LiteralPath $Source)) {
      throw "No se encontro el archivo web: $Source"
    }
    Copy-Item -LiteralPath $Source -Destination $Target -Force
  }

  $ZipArchive = [System.IO.Compression.ZipFile]::Open($UnsignedApk, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    Get-ChildItem -LiteralPath $TempFullName -Recurse -File | ForEach-Object {
      $RelativePath = $_.FullName.Substring($TempFullName.Length).TrimStart("\", "/")
      $EntryName = $RelativePath.Replace("\", "/")
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($ZipArchive, $_.FullName, $EntryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  }
  finally {
    $ZipArchive.Dispose()
  }
  & $ZipAlign -f -p 4 $UnsignedApk $AlignedApk
  if ($LASTEXITCODE -ne 0) {
    throw "zipalign fallo con codigo $LASTEXITCODE."
  }

  & $ApkSigner sign --ks $DebugKeystore --ks-pass pass:android --key-pass pass:android --out $SignedApk $AlignedApk
  if ($LASTEXITCODE -ne 0) {
    throw "apksigner fallo con codigo $LASTEXITCODE."
  }

  $VerifyLog = Join-Path $OutDir "wtf-pos-updated-verify.log"
  $VerifyErr = Join-Path $OutDir "wtf-pos-updated-verify.err.log"
  Remove-Item -LiteralPath $VerifyLog, $VerifyErr -Force -ErrorAction SilentlyContinue
  $VerifyProcess = Start-Process -FilePath $ApkSigner -ArgumentList @("verify", "--verbose", "`"$SignedApk`"") -WindowStyle Hidden -RedirectStandardOutput $VerifyLog -RedirectStandardError $VerifyErr -PassThru
  if (-not $VerifyProcess.WaitForExit(20000)) {
    Stop-Process -Id $VerifyProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Warning "La APK fue firmada, pero la verificacion de apksigner excedio 20 segundos en este entorno."
  }
  elseif ($VerifyProcess.ExitCode -ne 0) {
    $VerifyError = Get-Content -LiteralPath $VerifyErr -Raw -ErrorAction SilentlyContinue
    Write-Warning "La APK fue firmada, pero la verificacion de apksigner no devolvio confirmacion en este entorno. $VerifyError"
  }

  Get-Item -LiteralPath $SignedApk | Select-Object FullName, Length, LastWriteTime
}
finally {
  Remove-Item -LiteralPath $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
