# Локальний реліз Gym Tracker: перевірки -> збірка PWA -> публікація в dist.
# Дзеркало .github/workflows/release.yml (той — лише ручний fallback з CI).
#
# Використання:
#   .\scripts\Release-Local.ps1                 # patch-бамп (max(package.json, dist gym-v*))
#   .\scripts\Release-Local.ps1 -Bump minor
#   .\scripts\Release-Local.ps1 -Version 3.6.0
#   .\scripts\Release-Local.ps1 -SkipPublish
param(
  [ValidateSet('patch', 'minor', 'major')][string]$Bump = 'patch',
  [string]$Version = '',
  [switch]$SkipPublish,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$DistRepo = 'ajjs1ajjs/dist'
$Prefix = 'gym-v'

function Fail([string]$msg) { Write-Host "::error::$msg"; exit 1 }

# --- 0. Передумови -----------------------------------------------------------
foreach ($t in @('gh', 'node', 'npm', 'git')) {
  if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { Fail "$t not found in PATH" }
}
gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'gh not authenticated (gh auth login)' }
if (git status --porcelain) { Fail 'working tree is dirty — commit or stash first' }

# --- 1. Наступна версія (max package.json, dist) ------------------------------
$pkg = node -p "require('./package.json').version"
if ($Version) {
  $next = $Version
} else {
  $tags = gh release list --repo $DistRepo --limit 200 --json tagName --jq '.[].tagName'
  if ($LASTEXITCODE -ne 0) { Fail 'gh release list failed' }
  $pattern = "^" + $Prefix + '\d+\.\d+\.\d+$'
  $dist = $tags | Where-Object { $_ -match $pattern } | ForEach-Object { $_ -replace ("^" + $Prefix), '' } |
    Sort-Object { [version]$_ } | Select-Object -Last 1
  if (-not $dist) { $dist = '0.0.0' }
  $base = @($pkg, $dist) | Sort-Object { [version]$_ } | Select-Object -Last 1
  $v = [version]$base
  switch ($Bump) {
    'major' { $next = "$($v.Major + 1).0.0" }
    'minor' { $next = "$($v.Major).$($v.Minor + 1).0" }
    default { $next = "$($v.Major).$($v.Minor).$($v.Build + 1)" }
  }
}
$tag = "$Prefix$next"
Write-Host "Releasing $tag (package.json was $pkg)"
if (-not $SkipPublish -and -not $Force) {
  $ans = Read-Host "Publish $tag to $DistRepo? [y/N]"
  if ($ans -ne 'y' -and $ans -ne 'Y') { Write-Host 'aborted'; exit 0 }
}

# --- 2. Залежності + перевірки -------------------------------------------------
npm ci
if ($LASTEXITCODE -ne 0) { Fail 'npm ci failed' }
npm run lint
if ($LASTEXITCODE -ne 0) { Fail 'lint failed' }

# --- 3. Бамп package.json (ідемпотентно: повторний прогін не помилка) -----------
$pj = Get-Content package.json -Raw -Encoding utf8
if ($pj -notmatch '"version"\s*:\s*"[^"]*"') { Fail 'version not found in package.json' }
node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('package.json','utf8'));j.version='$next';fs.writeFileSync('package.json',JSON.stringify(j,null,2)+'\n');"
node -p "require('./package.json').version"

# --- 4. Тести + збірка -----------------------------------------------------------
npm test
if ($LASTEXITCODE -ne 0) { Fail 'tests failed' }
npm run build
if ($LASTEXITCODE -ne 0) { Fail 'build failed' }
if (-not (Test-Path dist/index.html)) { Fail 'dist/index.html missing after build' }

# --- 5. Архів + чексума ------------------------------------------------------------
tar -czf gym-site.tar.gz -C dist .
if ($LASTEXITCODE -ne 0) { Fail 'tar failed' }
$hash = (Get-FileHash gym-site.tar.gz -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  gym-site.tar.gz" | Out-File 'gym-site.tar.gz.sha256' -Encoding ascii -NoNewline
Get-Content 'gym-site.tar.gz.sha256'

# --- 6. Публікація ------------------------------------------------------------------
if ($SkipPublish) { Write-Host 'SkipPublish: archive ready (not published)'; exit 0 }
$prev = $tags | Where-Object { $_ -match $pattern -and $_ -ne $tag } |
  ForEach-Object { $_ -replace ("^" + $Prefix), '' } |
  Sort-Object { [version]$_ } | Select-Object -Last 1
if ($prev) { $notes = "**Full Changelog**: https://github.com/$DistRepo/compare/$Prefix$prev...$tag" }
else { $notes = "Gym Tracker $tag" }
gh release create $tag gym-site.tar.gz gym-site.tar.gz.sha256 --repo $DistRepo --title "Gym Tracker $tag" --notes $notes
if ($LASTEXITCODE -ne 0) { Fail 'gh release failed' }

# --- 7. Коміт бампа -------------------------------------------------------------------
Remove-Item gym-site.tar.gz, gym-site.tar.gz.sha256 -ErrorAction SilentlyContinue
git add package.json
if (git diff --cached --quiet) { Write-Host 'no changes'; exit 0 }
git commit -m "chore(release): $tag [skip ci]"
git push
Write-Host "Released $tag"
