<#
.SYNOPSIS
  Registers the nightly TOG 5 VMS backup as a Windows Scheduled Task.

.DESCRIPTION
  Runs backup.ps1 as SYSTEM every night, whether or not anybody is signed in.
  Run this once, from an elevated PowerShell prompt.

.EXAMPLE
  .\install-backup-task.ps1 -Destination "\\nas\backups\TOG5-VMS"
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Destination,

  [string]$At = "01:30",

  [string]$TaskName = "TOG 5 VMS nightly backup"
)

$ErrorActionPreference = "Stop"

$script = Join-Path $PSScriptRoot "backup.ps1"
if (-not (Test-Path $script)) {
  throw "Could not find $script."
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`" -Destination `"$Destination`"" `
  -WorkingDirectory $PSScriptRoot

$trigger = New-ScheduledTaskTrigger -Daily -At $At

# SYSTEM so it runs on a machine nobody is signed in to, which is the normal
# state of a server sitting in the corner of an office.
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -DontStopOnIdleEnd `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Description "Writes a TOG 5 VMS backup package to $Destination and prunes old ones." `
  -Force | Out-Null

Write-Output "Registered '$TaskName' to run daily at $At."
Write-Output "Run it once now to check it works:"
Write-Output "  Start-ScheduledTask -TaskName '$TaskName'"
