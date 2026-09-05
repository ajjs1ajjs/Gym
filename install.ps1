#!/usr/bin/env pwsh
#
# Gym Tracker - one-line installer/runner for Windows.
#
# Usage (PowerShell):
#   irm https://raw.githubusercontent.com/ajjs1ajjs/Gym/main/install.ps1 | iex
#   .\install.ps1            # build + serve dist/ on http://localhost:8080
#   .\install.ps1 -Dev       # Vite dev server on http://localhost:5173
#
# When piped through `irm | iex` there is no way to pass -Dev directly (iex
# just evaluates a script block), so the dev mode can also be requested with
# an environment variable set before the pipe:
#   $env:GYM_DEV = "1"; irm https://raw.githubusercontent.com/ajjs1ajjs/Gym/main/install.ps1 | iex
#
# Everything missing is installed automatically where possible: Node.js LTS
# (via winget, if available), the repository itself (cloned into .\Gym when
# not run from an existing checkout) and project dependencies via `npm ci`.

param(
    [switch]$Dev
)

$ErrorActionPreference = "Stop"

if ($env:GYM_DEV -eq "1") { $Dev = $true }

$RepoUrl     = "https://github.com/ajjs1ajjs/Gym.git"
$RepoZipUrl  = "https://github.com/ajjs1ajjs/Gym/archive/refs/heads/main.zip"
$RepoDirName = "Gym"

function Write-Log  ($msg) { Write-Host "[Gym] $msg" -ForegroundColor Cyan }
function Write-Warn ($msg) { Write-Host "[Gym] $msg" -ForegroundColor Yellow }
function Write-Err  ($msg) { Write-Host "[Gym] $msg" -ForegroundColor Red }

function Check-WindowsVersion {
    $osVersion = [System.Environment]::OSVersion.Version
    $build = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion").CurrentBuild

    $supportedBuilds = @(19044, 19045, 20049, 20348, 21313, 21382, 22000, 22336, 22621, 22631, 23466, 23530, 25398)

    if (-not ($build -in $supportedBuilds)) {
        Write-Err "Unsupported Windows version: Build $build."
        Write-Host "Supported: Windows 10 21H1+, Windows 11 22H2+, Windows Server 2022/2025."
        exit 1
    }
    Write-Log "Detected Windows Build $build — supported."
}

Check-WindowsVersion

function Test-NodeVersionOk {
    try {
        $v = (node --version) -replace '^v', ''
        $major = [int]($v.Split('.')[0])
        return $major -ge 20
    } catch {
        return $false
    }
}

function Ensure-Node {
    if ((Get-Command node -ErrorAction SilentlyContinue) -and (Get-Command npm -ErrorAction SilentlyContinue) -and (Test-NodeVersionOk)) {
        return
    }
    Write-Log "Node.js 20+ not found on PATH."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Log "Attempting automatic install via winget (OpenJS.NodeJS.LTS)..."
        try {
            winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
        } catch {
            Write-Warn "winget install failed: $($_.Exception.Message)"
        }
        # Refresh PATH for the current process so a freshly-installed node is visible
        # without requiring a new shell.
        $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
        $userPath    = [System.Environment]::GetEnvironmentVariable("Path", "User")
        $env:Path    = "$machinePath;$userPath"
    }
    if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Test-NodeVersionOk)) {
        Write-Err "Node.js 20+ is required and could not be installed automatically."
        Write-Host "Install it manually, then re-run this script:"
        Write-Host "  winget install --id OpenJS.NodeJS.LTS -e"
        Write-Host "  or download from https://nodejs.org"
        exit 1
    }
}

# --- Locate or fetch the repository -----------------------------------------
function Find-RepoRoot {
    $pkg = Join-Path (Get-Location) "package.json"
    if (Test-Path $pkg) {
        $content = Get-Content $pkg -Raw
        if ($content -match '"name":\s*"gym-tracker"') {
            return (Get-Location).Path
        }
    }
    if ($PSScriptRoot) {
        $scriptPkg = Join-Path $PSScriptRoot "package.json"
        if (Test-Path $scriptPkg) {
            $content = Get-Content $scriptPkg -Raw
            if ($content -match '"name":\s*"gym-tracker"') {
                return $PSScriptRoot
            }
        }
    }
    return $null
}

$RepoRoot = Find-RepoRoot

if (-not $RepoRoot) {
    if (Test-Path (Join-Path $RepoDirName ".git")) {
        Write-Log "Using existing checkout at .\$RepoDirName"
    } elseif (Get-Command git -ErrorAction SilentlyContinue) {
        Write-Log "Cloning $RepoUrl into .\$RepoDirName ..."
        git clone --depth 1 $RepoUrl $RepoDirName
    } else {
        Write-Log "git not found - downloading $RepoZipUrl instead..."
        $tmpZip = Join-Path $env:TEMP "gym-tracker-$(Get-Random).zip"
        Invoke-WebRequest -Uri $RepoZipUrl -OutFile $tmpZip -UseBasicParsing
        $tmpExtract = Join-Path $env:TEMP "gym-tracker-extract-$(Get-Random)"
        Expand-Archive -Path $tmpZip -DestinationPath $tmpExtract -Force
        $extracted = Get-ChildItem -Path $tmpExtract -Directory | Select-Object -First 1
        Move-Item -Path $extracted.FullName -Destination $RepoDirName
        Remove-Item $tmpZip, $tmpExtract -Recurse -Force -ErrorAction SilentlyContinue
    }
    $RepoRoot = (Resolve-Path $RepoDirName).Path
}

Set-Location $RepoRoot

Ensure-Node
Write-Log "Node $(node --version), npm $(npm --version)"

Write-Log "Installing dependencies..."
npm ci
if ($LASTEXITCODE -ne 0) { Write-Err "npm ci failed."; exit $LASTEXITCODE }

if ($Dev) {
    Write-Log "Starting Vite dev server on http://localhost:5173 ..."
    npm run dev
    exit $LASTEXITCODE
}

Write-Log "Building production bundle..."
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "npm run build failed."; exit $LASTEXITCODE }

Write-Log "==============================================="
Write-Log " Gym Tracker is ready"
Write-Log "   Build output: $RepoRoot\dist"
Write-Log "   Serving at:   http://localhost:8080"
Write-Log "==============================================="

npx --yes serve dist -l 8080
