$ErrorActionPreference = "Stop"

$SdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$ToolsRoot = Join-Path $SdkRoot "cmdline-tools"
$LatestRoot = Join-Path $ToolsRoot "latest"
$ZipPath = Join-Path $env:TEMP "commandlinetools-win-15859902_latest.zip"
$Url = "https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip"
$ExtractTemp = Join-Path $env:TEMP "android-cmdline-tools-extract"

New-Item -ItemType Directory -Force -Path $ToolsRoot | Out-Null

if (!(Test-Path $ZipPath)) {
  Invoke-WebRequest -Uri $Url -OutFile $ZipPath
}

if (Test-Path $ExtractTemp) {
  Remove-Item -LiteralPath $ExtractTemp -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $ExtractTemp | Out-Null

Expand-Archive -LiteralPath $ZipPath -DestinationPath $ExtractTemp -Force

if (Test-Path $LatestRoot) {
  Remove-Item -LiteralPath $LatestRoot -Recurse -Force
}

Move-Item -LiteralPath (Join-Path $ExtractTemp "cmdline-tools") -Destination $LatestRoot

[Environment]::SetEnvironmentVariable("ANDROID_HOME", $SdkRoot, "User")
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $SdkRoot, "User")
$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot

Write-Output "ANDROID_HOME=$SdkRoot"
& (Join-Path $LatestRoot "bin\sdkmanager.bat") --version
