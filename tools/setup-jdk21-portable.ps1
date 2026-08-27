$ErrorActionPreference = "Stop"

$JdkDir = Join-Path $env:LOCALAPPDATA "Programs\jdk-21-portable"
$ZipPath = Join-Path $env:TEMP "temurin-jdk-21.zip"
$Url = "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse"
$ExtractTemp = Join-Path $env:TEMP "jdk-21-extract"

if (!(Test-Path $ZipPath)) {
  Invoke-WebRequest -Uri $Url -OutFile $ZipPath
}

if (Test-Path $ExtractTemp) {
  Remove-Item -LiteralPath $ExtractTemp -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $ExtractTemp | Out-Null

Expand-Archive -LiteralPath $ZipPath -DestinationPath $ExtractTemp -Force

$Extracted = Get-ChildItem -Path $ExtractTemp -Directory | Select-Object -First 1
if (!$Extracted) {
  throw "No se pudo extraer JDK 21"
}

if (Test-Path $JdkDir) {
  Remove-Item -LiteralPath $JdkDir -Recurse -Force
}
Move-Item -LiteralPath $Extracted.FullName -Destination $JdkDir

[Environment]::SetEnvironmentVariable("WTF_JDK21_HOME", $JdkDir, "User")

& (Join-Path $JdkDir "bin\java.exe") -version
Write-Output "JDK21=$JdkDir"
