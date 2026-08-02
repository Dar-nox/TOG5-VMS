<#
.SYNOPSIS
  Writes a TOG 5 VMS backup package and removes ones that are past their keep
  window.

.DESCRIPTION
  Calls `vms-server.exe backup`, which uses SQLite's VACUUM INTO to copy a
  database that is being written to at the same time, then copies the photos
  and receipts alongside it. The result is an ordinary .tog5backup package —
  the same thing the Backup screen produces, and restorable the same way.

  The server does not have to be stopped for this.

.PARAMETER Destination
  Where the packages go. Put this on a different disk or a network share:
  a backup on the same drive as the database does not survive that drive
  failing.

.PARAMETER KeepDays
  Packages older than this are deleted after a new one is written.

.EXAMPLE
  .\backup.ps1 -Destination "\\nas\backups\TOG5-VMS"
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Destination,

  [string]$ServerExe = (Join-Path $PSScriptRoot "vms-server.exe"),

  [string]$DataDir = "C:\ProgramData\TOG5 VMS",

  [int]$KeepDays = 30
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ServerExe)) {
  throw "Could not find $ServerExe. Pass -ServerExe with the full path."
}

New-Item -ItemType Directory -Force -Path $Destination | Out-Null

$env:VMS_DATA_DIR = $DataDir
& $ServerExe backup $Destination
if ($LASTEXITCODE -ne 0) {
  throw "The backup did not complete. Nothing old was deleted."
}

# Only prune once a new package exists, so a run of failures can never leave
# the client with no backups at all.
$cutoff = (Get-Date).AddDays(-$KeepDays)
$expired = Get-ChildItem -Path $Destination -Directory -Filter "*.tog5backup" |
  Where-Object { $_.LastWriteTime -lt $cutoff }

foreach ($package in $expired) {
  Remove-Item -Recurse -Force -LiteralPath $package.FullName
  Write-Output "Removed expired backup $($package.Name)"
}
