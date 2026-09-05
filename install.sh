#!/usr/bin/env bash
#
# Gym Tracker - one-line installer/runner for Ubuntu / Debian.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/ajjs1ajjs/Gym/main/install.sh | bash
#   bash install.sh            # build + serve dist/ on http://localhost:8080
#   bash install.sh --dev      # Vite dev server on http://localhost:5173
#
# Everything missing is installed automatically: Node.js 22 (NodeSource),
# the repository itself (cloned into ./Gym when not run from an existing
# checkout) and project dependencies via `npm ci`.

set -euo pipefail

REPO_URL="https://github.com/ajjs1ajjs/Gym.git"
REPO_DIR_NAME="Gym"

DEV=0
for arg in "$@"; do
    case "$arg" in
        --dev) DEV=1 ;;
    esac
done

log()  { printf '\033[1;36m[Gym]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[Gym]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[Gym]\033[0m %s\n' "$*" >&2; exit 1; }

check_ubuntu_version() {
    if [ ! -f /etc/os-release ]; then
        fail "Cannot determine OS version (/etc/os-release not found)."
    fi
    . /etc/os-release
    if [ "$ID" != "ubuntu" ] && [ "$ID" != "debian" ]; then
        fail "This installer supports Ubuntu and Debian only. Detected: $ID"
    fi
    local ver="${VERSION_ID%%.*}"
    local supported="24 25 26"
    local is_supported=0
    for s in $supported; do
        if [ "$ver" = "$s" ]; then
            is_supported=1
            break
        fi
    done
    if [ "$is_supported" -eq 0 ]; then
        fail "Unsupported $ID version: $VERSION_ID. Supported: Ubuntu/Debian 24, 25, 26 (latest and preview)."
    fi
    log "Detected $ID $VERSION_ID ($PRETTY_NAME) — supported."
}

check_ubuntu_version

ensure_node() {
    if command -v npm >/dev/null 2>&1; then
        return 0
    fi
    log "npm not found - installing Node.js 22..."
    if command -v apt-get >/dev/null 2>&1 && command -v curl >/dev/null 2>&1; then
        if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi
        curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO bash -
        $SUDO apt-get install -y nodejs || fail "Node.js installation failed. Install it manually: https://nodejs.org"
    else
        fail "Need apt-get + curl to auto-install Node.js, or install Node.js 20+ manually and re-run."
    fi
    command -v npm >/dev/null 2>&1 || fail "Node.js installed but 'npm' is not on PATH yet. Open a new shell and re-run."
}

# --- Locate or fetch the repository -----------------------------------------
# Running locally (bash install.sh from a checkout) uses that checkout.
# Running via `curl ... | bash` has no on-disk script, so BASH_SOURCE[0] is
# empty/unreliable - clone the repo into ./Gym in that case instead.
find_repo_root() {
    if [ -f "package.json" ] && grep -q '"name": "gym-tracker"' package.json 2>/dev/null; then
        pwd
        return 0
    fi
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]:-.}")" 2>/dev/null && pwd || true)"
    if [ -n "$script_dir" ] && [ -f "$script_dir/package.json" ] && grep -q '"name": "gym-tracker"' "$script_dir/package.json" 2>/dev/null; then
        echo "$script_dir"
        return 0
    fi
    return 1
}

REPO_ROOT="$(find_repo_root || true)"

if [ -z "$REPO_ROOT" ]; then
    if [ -d "$REPO_DIR_NAME/.git" ]; then
        log "Using existing checkout at ./$REPO_DIR_NAME"
    else
        command -v git >/dev/null 2>&1 || fail "git is required to clone the repository. Install it: sudo apt install -y git"
        log "Cloning $REPO_URL into ./$REPO_DIR_NAME ..."
        git clone --depth 1 "$REPO_URL" "$REPO_DIR_NAME"
    fi
    REPO_ROOT="$(cd "$REPO_DIR_NAME" && pwd)"
fi

cd "$REPO_ROOT"

ensure_node
log "Node $(node --version), npm $(npm --version)"

log "Installing dependencies..."
npm ci

if [ "$DEV" -eq 1 ]; then
    log "Starting Vite dev server on http://localhost:5173 ..."
    exec npm run dev
fi

log "Building production bundle..."
npm run build

log "==============================================="
log " Gym Tracker is ready"
log "   Build output: $REPO_ROOT/dist"
log "   Serving at:   http://localhost:8080"
log "==============================================="

if command -v npx >/dev/null 2>&1; then
    exec npx --yes serve dist -l 8080
elif command -v python3 >/dev/null 2>&1; then
    cd dist
    exec python3 -m http.server 8080
else
    fail "Neither 'npx' nor 'python3' found to serve dist/. Serve $REPO_ROOT/dist with any static file server."
fi
