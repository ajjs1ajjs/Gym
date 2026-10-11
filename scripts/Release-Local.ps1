# Локальний реліз Gym Tracker: перевірки -> збірка -> публікація білда в dist/gym.
# Дзеркало .github/workflows/release.yml (той — лише ручний fallback з CI).
# Публікує ТІЛЬКИ якщо збірка відрізняється від живого сайту. Інакше — ні тега, ні бампа.
#
# Використання:
#   .\scripts\Release-Local.ps1                 # patch-бамп при реальних змінах
#   .\scripts\Release-Local.ps1 -Bump minor
#   .\scripts\Release-Local.ps1 -Version 3.6.0
#   .\scripts\Release-Local.ps1 -SkipPublish    # тільки локальні перевірки й білд
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
$tags = gh release list --repo $DistRepo --limit 200 --json tagName --jq '.[].tagName'
if ($LASTEXITCODE -ne 0) { Fail 'gh release list failed' }
$pattern = "^" + $Prefix + '\d+\.\d+\.\d+$'
$dist = $tags | Where-Object { $_ -match $pattern } | ForEach-Object { $_ -replace ("^" + $Prefix), '' } |
  Sort-Object { [version]$_ } | Select-Object -Last 1
if (-not $dist) { $dist = '0.0.0' }
if ($Version) {
  $next = $Version
} else {
  $base = @($pkg, $dist) | Sort-Object { [version]$_ } | Select-Object -Last 1
  $v = [version]$base
  switch ($Bump) {
    'major' { $next = "$($v.Major + 1).0.0" }
    'minor' { $next = "$($v.Major).$($v.Minor + 1).0" }
    default { $next = "$($v.Major).$($v.Minor).$($v.Build + 1)" }
  }
}
$tag = "$Prefix$next"
Write-Host "Candidate tag: $tag (package.json was $pkg)"

# --- 2. Перевірки + збірка ---------------------------------------------------
npm ci
if ($LASTEXITCODE -ne 0) { Fail 'npm ci failed' }
npm audit --audit-level=high
if ($LASTEXITCODE -ne 0) { Fail 'npm audit found high+ vulnerabilities' }
npm run lint
if ($LASTEXITCODE -ne 0) { Fail 'lint failed' }
npm test
if ($LASTEXITCODE -ne 0) { Fail 'tests failed' }
npm run build
if ($LASTEXITCODE -ne 0) { Fail 'build failed' }
if (-not (Test-Path dist/index.html)) { Fail 'dist/index.html missing after build' }

if ($SkipPublish) { Write-Host 'SkipPublish: build ready (not published)'; exit 0 }

# --- 3. Публікація в dist (тільки при змінах) --------------------------------
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('dist-gym-{0}' -f [guid]::NewGuid().ToString('N'))
# Жодних токенів у командному рядку — автентифікація через credential
# helper у keyring (gh auth), тому тут звичайний clone/push без секретів.
git clone "https://github.com/$DistRepo.git" $tmp --depth 1 --quiet
if ($LASTEXITCODE -ne 0) { Fail 'dist clone failed' }
try {
  New-Item -ItemType Directory -Path "$tmp/gym" -Force | Out-Null
  # Дзеркало dist/gym <- dist/; наявний .nojekyll у dist зберігаємо як було.
  robocopy dist "$tmp/gym" /MIR /XF .nojekyll /NJH /NJS /NDL | Out-Null
  if ($LASTEXITCODE -ge 8) { Fail "robocopy failed ($LASTEXITCODE)" }
  Push-Location $tmp
  git config user.name 'local-release'
  git config user.email 'local-release@localhost'
  git add -A gym
  if (git diff --cached --quiet) {
    Write-Host 'No site changes to publish — no tag, no bump. Done.'
    Pop-Location
    exit 0
  }
  if (-not $Force) {
    $ans = Read-Host "Publish site build ($tag)? [y/N]"
    if ($ans -ne 'y' -and $ans -ne 'Y') { Pop-Location; Write-Host 'aborted'; exit 0 }
  }
  git commit -m "chore(gym): publish site build ($tag)"
  git push origin HEAD:main
  Pop-Location
  Write-Host "Published $tag build."
} finally {
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
}

# --- 4. Тег релізу ------------------------------------------------------------
# Note: gh exits 1 when the release is missing — expected on first publish.
# Temporarily relax the preference so the probe can't terminate the script.
$prevPref = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  gh release view $tag --repo $DistRepo 2>$null | Out-Null
  $tagExists = ($LASTEXITCODE -eq 0)
} catch {
  $tagExists = $false
} finally {
  $ErrorActionPreference = $prevPref
}
if (-not $tagExists) {
  $prev = $tags | Where-Object { $_ -match $pattern -and $_ -ne $tag } |
    ForEach-Object { $_ -replace ("^" + $Prefix), '' } |
    Sort-Object { [version]$_ } | Select-Object -Last 1
  if ($prev) { $notes = "**Full Changelog**: https://github.com/$DistRepo/compare/$Prefix$prev...$tag" }
  else { $notes = "Gym Tracker $tag" }
  gh release create $tag --repo $DistRepo --title "Gym Tracker v$next" --notes $notes
  if ($LASTEXITCODE -ne 0) { Fail 'gh release failed' }
} else {
  Write-Host "Release $tag already exists."
}

# --- 5. Бамп версії ------------------------------------------------------------
node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('package.json','utf8'));j.version='$next';fs.writeFileSync('package.json',JSON.stringify(j,null,2)+'\n');"
git add package.json
if (git diff --cached --quiet) { Write-Host 'no changes'; exit 0 }
git commit -m "chore(release): $tag [skip ci]"
git push
Write-Host "Released $tag"
