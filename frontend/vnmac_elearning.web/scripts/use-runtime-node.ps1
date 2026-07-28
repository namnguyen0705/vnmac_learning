param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$CommandLine
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

$runtimeNodeBin = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$runtimeFallbackBin = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback"

if (Test-Path (Join-Path $runtimeNodeBin "node.exe")) {
  $env:PATH = "$runtimeNodeBin;$runtimeFallbackBin;$env:PATH"
}

$nodeVersion = (& node -p "process.versions.node").Trim()
$nodeMajor = [int]($nodeVersion.Split(".")[0])

if ($nodeMajor -lt 18) {
  Write-Error "Frontend can not run with Node $nodeVersion. Install Node.js 18+ or open VS Code from the workspace so bundled Node is available."
  exit 1
}

if ($CommandLine.Count -eq 0) {
  Write-Error "Missing command to run."
  exit 1
}

$command = $CommandLine[0]
$commandArgs = @()
if ($CommandLine.Count -gt 1) {
  $commandArgs = $CommandLine[1..($CommandLine.Count - 1)]
}

& $command @commandArgs
exit $LASTEXITCODE
