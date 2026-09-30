param([string]$Secret = "")
$ErrorActionPreference = "Stop"
if (!$Secret) {
  $secure = Read-Host "Credencial tecnica del Host" -AsSecureString
} else {
  $secure = ConvertTo-SecureString $Secret -AsPlainText -Force
}
Write-Output (ConvertFrom-SecureString $secure)
