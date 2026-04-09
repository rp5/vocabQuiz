#!/bin/bash
# adminTools.sh — Rigor server management and quiz publishing

set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PID_FILE="$SCRIPT_DIR/.server.pid"
MODE_FILE="$SCRIPT_DIR/.server.mode"
LOG_FILE="$SCRIPT_DIR/.server.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[info]${NC} $1"; }
ok()    { echo -e "${GREEN}[ok]${NC} $1"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $1"; }
err()   { echo -e "${RED}[error]${NC} $1" >&2; }

# DATA_DIR is required for all commands except init-data, package, and help
require_data_dir() {
  if [ -z "$DATA_DIR" ]; then
    err "DATA_DIR environment variable is required."
    echo ""
    echo "Set up a data directory first:"
    echo "  ./adminTools.sh init-data ~/rigor-data"
    echo "  export DATA_DIR=~/rigor-data"
    exit 1
  fi
  if [ ! -d "$DATA_DIR" ]; then
    err "DATA_DIR does not exist or is not a directory: $DATA_DIR"
    echo "  Create it with: ./adminTools.sh init-data $DATA_DIR"
    exit 1
  fi
}

# Set paths from DATA_DIR (only valid after require_data_dir)
setup_paths() {
  DATA_FILE="$DATA_DIR/data.json"
  SEQ_FILE="$DATA_DIR/seq_counter"
  QUIZZES_DIR="$DATA_DIR/quizzes"
}

# --- Process management helpers ---

is_running() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    # Stale PID file
    rm -f "$PID_FILE"
  fi
  return 1
}

get_pid() {
  cat "$PID_FILE" 2>/dev/null
}

do_start() {
  local prod=false
  if [ "$1" = "--prod" ]; then
    prod=true
  fi

  if is_running; then
    warn "Server is already running (PID $(get_pid))"
    return 0
  fi

  cd "$SCRIPT_DIR"

  if $prod; then
    info "Building for production..."
    npm run build --silent
    info "Starting production server..."
    NODE_ENV=production nohup node server.cjs > "$LOG_FILE" 2>&1 &
  else
    info "Starting development server..."
    nohup npm run dev:host > "$LOG_FILE" 2>&1 &
  fi

  local pid=$!
  echo "$pid" > "$PID_FILE"
  if $prod; then
    echo "prod" > "$MODE_FILE"
  else
    echo "dev" > "$MODE_FILE"
  fi

  # Wait briefly to check it didn't die immediately
  sleep 1
  local lan_ip=""
  # Linux
  lan_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  # macOS fallback — try common interfaces
  if [ -z "$lan_ip" ]; then
    lan_ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
  fi
  if kill -0 "$pid" 2>/dev/null; then
    local port=5173
    $prod && port=3000
    ok "Server started (PID $pid)"
    info "  Local:   http://localhost:$port"
    if [ -n "$lan_ip" ]; then
      info "  Network: http://$lan_ip:$port"
      info "  Kids:    http://$lan_ip:$port/quiz/login"
    fi
    info "  Data:    $DATA_DIR"
  else
    rm -f "$PID_FILE"
    err "Server failed to start. Check $LOG_FILE"
    return 1
  fi
}

do_stop() {
  if ! is_running; then
    warn "Server is not running"
    return 0
  fi

  local pid
  pid=$(get_pid)
  info "Stopping server (PID $pid)..."

  # Kill process group (handles concurrently's child processes)
  kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true

  # Wait for it to die
  local tries=0
  while kill -0 "$pid" 2>/dev/null && [ $tries -lt 10 ]; do
    sleep 0.5
    tries=$((tries + 1))
  done

  if kill -0 "$pid" 2>/dev/null; then
    warn "Force killing..."
    kill -9 -- -"$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
  fi

  rm -f "$PID_FILE"
  rm -f "$MODE_FILE"
  ok "Server stopped"
}

get_running_mode() {
  if [ -f "$MODE_FILE" ]; then
    cat "$MODE_FILE"
  else
    echo "dev"
  fi
}

do_restart() {
  # If no explicit mode flag given, preserve the mode of the running server
  local mode_arg="$1"
  if [ -z "$mode_arg" ]; then
    local prev_mode
    prev_mode=$(get_running_mode)
    if [ "$prev_mode" = "prod" ]; then
      mode_arg="--prod"
      info "Detected production mode, restarting in production mode"
    fi
  fi
  do_stop
  do_start "$mode_arg"
}

do_status() {
  if is_running; then
    ok "Server is running (PID $(get_pid))"
  else
    info "Server is not running"
  fi
  info "DATA_DIR: $DATA_DIR"
}

# --- Reset password ---

do_reset_password() {
  if is_running; then
    warn "Server is running. Changes to data.json may be overwritten."
    warn "Stop the server first with: ./adminTools.sh stop"
    read -p "Continue anyway? (y/N) " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
      info "Aborted"
      return 0
    fi
  fi

  if [ ! -f "$DATA_FILE" ]; then
    err "data.json not found at $DATA_FILE"
    return 1
  fi

  node -e "
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('$DATA_FILE', 'utf-8'));
    data.providerPasswordHash = '';
    fs.writeFileSync('$DATA_FILE', JSON.stringify(data, null, 2));
  "

  ok "Admin password cleared. Next login will prompt to set a new password."
}

# --- Publish quiz ---

do_publish() {
  local file="$1"
  local student="$2"

  if [ -z "$file" ] || [ -z "$student" ]; then
    err "Usage: ./adminTools.sh publish <file.json> <student-name>"
    return 1
  fi

  # Resolve file path
  if [ ! -f "$file" ]; then
    err "File not found: $file"
    return 1
  fi

  # Validate JSON
  if ! node -e "JSON.parse(require('fs').readFileSync('$file', 'utf-8'))" 2>/dev/null; then
    err "Invalid JSON: $file"
    return 1
  fi

  # Infer quiz type
  local quiz_type
  quiz_type=$(node -e "
    const q = JSON.parse(require('fs').readFileSync('$file', 'utf-8'));
    if (q.satQuestions) console.log('satReading');
    else if (q.passage || q.questions) console.log('reading');
    else console.log('vocab');
  ")
  info "Detected quiz type: $quiz_type"

  # Get next seq ID
  local seq_id
  if [ -f "$SEQ_FILE" ]; then
    seq_id=$(cat "$SEQ_FILE")
  else
    seq_id=5000
  fi
  info "Assigning seq: $seq_id"

  # Get the filename (basename)
  local basename
  basename=$(basename "$file")

  # Map quiz type to subdir
  local subdir
  case "$quiz_type" in
    vocab)      subdir="vocab" ;;
    reading)    subdir="reading" ;;
    satReading) subdir="sat-reading" ;;
    *)          subdir="vocab" ;;
  esac

  local dest_dir="$QUIZZES_DIR/$subdir"
  mkdir -p "$dest_dir"

  # Write modified quiz to destination
  node -e "
    const fs = require('fs');
    const quiz = JSON.parse(fs.readFileSync('$file', 'utf-8'));
    quiz.seq = $seq_id;
    quiz.assignTo = '$student';
    if (!quiz.type && '$quiz_type' !== 'vocab') {
      quiz.type = '$quiz_type';
    }
    fs.writeFileSync('$dest_dir/$basename', JSON.stringify(quiz, null, 2));
  "
  ok "Copied $basename to $subdir/ (seq=$seq_id, assignTo=$student)"

  # Increment and persist seq counter
  echo $((seq_id + 1)) > "$SEQ_FILE"

  # Hot-reload if server is running
  if is_running; then
    info "Reloading quizzes on running server..."
    if curl -s -X POST http://localhost:3001/api/reload-quizzes > /dev/null 2>&1 || \
       curl -s -X POST http://localhost:3000/api/reload-quizzes > /dev/null 2>&1; then
      ok "Quizzes reloaded"
    else
      warn "Could not reach server for hot-reload. Restart manually if needed."
    fi
  fi

  ok "Published: $basename (type=$quiz_type, seq=$seq_id, student=$student)"
}

# --- Init data directory ---

do_init_data() {
  local target="$1"

  if [ -z "$target" ]; then
    err "Usage: ./adminTools.sh init-data <directory>"
    echo ""
    echo "Example:"
    echo "  ./adminTools.sh init-data ~/rigor-data"
    return 1
  fi

  # Expand ~ if present
  target="${target/#\~/$HOME}"

  info "Initializing data directory: $target"

  # Create directory structure with subdirs
  mkdir -p "$target/quizzes/vocab"
  mkdir -p "$target/quizzes/reading"
  mkdir -p "$target/quizzes/sat-reading"

  # Copy or create data.json
  if [ -f "$target/data.json" ]; then
    info "data.json already exists, keeping it"
  elif [ -f "$SCRIPT_DIR/data.json" ]; then
    cp "$SCRIPT_DIR/data.json" "$target/data.json"
    ok "Copied data.json"
  else
    echo '{ "providerPasswordHash": "", "kids": [], "quizzes": [], "results": [] }' > "$target/data.json"
    ok "Created empty data.json"
  fi

  # Copy seq_counter if it exists
  if [ -f "$target/seq_counter" ]; then
    info "seq_counter already exists, keeping it"
  elif [ -f "$SCRIPT_DIR/seq_counter" ]; then
    cp "$SCRIPT_DIR/seq_counter" "$target/seq_counter"
    ok "Copied seq_counter"
  fi

  # Copy quizzes from public/quizzes/ into correct subdirs
  local src_quizzes="$SCRIPT_DIR/public/quizzes"
  local count=0
  for subdir in vocab reading sat-reading; do
    local sub_src="$src_quizzes/$subdir"
    [ -d "$sub_src" ] || continue
    for f in "$sub_src"/*.json; do
      [ -f "$f" ] || continue
      local bname
      bname=$(basename "$f")
      if [ ! -f "$target/quizzes/$subdir/$bname" ]; then
        cp "$f" "$target/quizzes/$subdir/$bname"
        count=$((count + 1))
      fi
    done
  done
  # Also copy any flat root-level quiz files (backward compat)
  for f in "$src_quizzes"/*.json; do
    [ -f "$f" ] || continue
    local bname
    bname=$(basename "$f")
    [ "$bname" = "index.json" ] && continue
    # Detect type and copy to correct subdir
    local qtype
    qtype=$(node -e "
      const q = JSON.parse(require('fs').readFileSync('$f', 'utf-8'));
      if (q.satQuestions) console.log('sat-reading');
      else if (q.passage || q.questions) console.log('reading');
      else console.log('vocab');
    ")
    if [ ! -f "$target/quizzes/$qtype/$bname" ]; then
      cp "$f" "$target/quizzes/$qtype/$bname"
      count=$((count + 1))
    fi
  done
  if [ $count -gt 0 ]; then
    ok "Copied $count quiz file(s) into subdirectories"
  else
    info "All quiz files already exist in target, skipped"
  fi

  echo ""
  ok "Data directory initialized: $target"
  echo ""
  echo "Contents:"
  ls -la "$target/"
  echo ""
  for subdir in vocab reading sat-reading; do
    local sub_path="$target/quizzes/$subdir"
    local sub_count
    sub_count=$(find "$sub_path" -name '*.json' 2>/dev/null | wc -l)
    echo "  quizzes/$subdir/ — $sub_count file(s)"
  done
  echo ""
  echo "To use this data directory, set DATA_DIR before starting:"
  echo ""
  echo "  export DATA_DIR=$target"
  echo "  ./adminTools.sh start --prod"
  echo ""
  echo "Or add to your shell profile (~/.bashrc or ~/.zshrc):"
  echo ""
  echo "  export DATA_DIR=$target"
}

# --- Package tarball ---

do_package() {
  local version
  version=$(node -e "console.log(require('$SCRIPT_DIR/package.json').version)" 2>/dev/null || echo "0.0.0")
  local outfile="vocabQuiz-${version}.tar.gz"

  cd "$SCRIPT_DIR/.."
  tar \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='test-results' \
    --exclude='data.json' \
    --exclude='data.test.json' \
    --exclude='seq_counter' \
    --exclude='.server.pid' \
    --exclude='.server.log' \
    -czf "$outfile" \
    "$(basename "$SCRIPT_DIR")/"

  local size
  size=$(du -h "$outfile" | cut -f1)
  ok "Created $outfile ($size)"
  info "Path: $(cd "$SCRIPT_DIR/.." && pwd)/$outfile"
}

# --- Upgrade from tarball ---

do_upgrade() {
  local tarball="$1"

  if [ -z "$tarball" ]; then
    err "Usage: ./adminTools.sh upgrade <vocabQuiz.tar.gz>"
    return 1
  fi

  if [ ! -f "$tarball" ]; then
    err "File not found: $tarball"
    return 1
  fi

  # Resolve to absolute path before we cd around
  tarball=$(cd "$(dirname "$tarball")" && echo "$(pwd)/$(basename "$tarball")")

  info "Upgrading from: $tarball"
  info "Code dir:       $SCRIPT_DIR"
  info "Data dir:       $DATA_DIR (will NOT be touched)"

  # Stop server if running
  if is_running; then
    do_stop
  fi

  # Save current version for log
  local old_version=""
  if [ -f "$SCRIPT_DIR/package.json" ]; then
    old_version=$(node -e "console.log(require('$SCRIPT_DIR/package.json').version)" 2>/dev/null || echo "unknown")
  fi

  # Figure out the tar structure — strip the top-level directory if present
  local strip=0
  local top_entry
  top_entry=$(tar tzf "$tarball" 2>/dev/null | head -1)
  if [[ "$top_entry" == */ ]] && [[ "$top_entry" != "./"* ]]; then
    strip=1
  fi

  # Extract over the code directory, excluding data files
  info "Extracting new code..."
  tar xzf "$tarball" \
    --strip-components=$strip \
    --exclude='data.json' \
    --exclude='data.test.json' \
    --exclude='seq_counter' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='test-results' \
    --exclude='.server.pid' \
    --exclude='.server.log' \
    -C "$SCRIPT_DIR"

  # Install dependencies
  cd "$SCRIPT_DIR"
  info "Installing dependencies..."
  npm install --silent

  # Read new version
  local new_version=""
  if [ -f "$SCRIPT_DIR/package.json" ]; then
    new_version=$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "unknown")
  fi

  # Build and start
  info "Building for production..."
  npm run build --silent

  info "Starting server..."
  do_start --prod

  echo ""
  ok "Upgrade complete: $old_version -> $new_version"
}

# --- Main ---

usage() {
  echo "Usage: ./adminTools.sh <command> [options]"
  echo ""
  echo "Commands:"
  echo "  start [--prod]                    Start server (dev mode by default)"
  echo "  stop                              Stop server"
  echo "  restart [--prod]                  Restart server"
  echo "  status                            Show server status"
  echo "  reset-password                    Clear admin password (re-setup on next login)"
  echo "  publish <file.json> <student>     Publish quiz file for a student"
  echo "  init-data <directory>             Initialize external data directory for production"
  echo "  package                           Create a tarball for deployment"
  echo "  upgrade <tarball.tar.gz>          Upgrade code from tarball (requires DATA_DIR)"
  echo ""
  echo "Environment:"
  echo "  DATA_DIR    (Required) Data directory containing data.json, quizzes/, seq_counter."
  echo "              All state reads/writes go to this directory."
  echo "              Set up with: ./adminTools.sh init-data <directory>"
  echo ""
  echo "Examples:"
  echo "  ./adminTools.sh init-data ~/rigor-data      # Set up data directory"
  echo "  export DATA_DIR=~/rigor-data"
  echo "  ./adminTools.sh start                       # Start dev server"
  echo "  ./adminTools.sh start --prod                # Build and start production"
  echo "  ./adminTools.sh publish week13.json Shrey   # Publish quiz"
}

case "${1:-}" in
  # Commands that don't require DATA_DIR
  init-data)      do_init_data "$2" ;;
  package)        do_package ;;
  help|--help|-h) usage ;;
  # Commands that require DATA_DIR
  start)          require_data_dir; setup_paths; do_start "$2" ;;
  stop)           do_stop ;;
  restart)        require_data_dir; setup_paths; do_restart "$2" ;;
  status)         require_data_dir; setup_paths; do_status ;;
  reset-password) require_data_dir; setup_paths; do_reset_password ;;
  publish)        require_data_dir; setup_paths; do_publish "$2" "$3" ;;
  upgrade)        require_data_dir; setup_paths; do_upgrade "$2" ;;
  *)
    if [ -n "$1" ]; then
      err "Unknown command: $1"
    fi
    usage
    exit 1
    ;;
esac
