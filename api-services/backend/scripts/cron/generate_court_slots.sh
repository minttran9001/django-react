#!/usr/bin/env bash
# Extend the CourtSlot availability index and prune past rows.
# Intended for system cron — see crontab.example in this directory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${BACKEND_DIR}/logs"
LOG_FILE="${LOG_DIR}/generate_court_slots.log"

mkdir -p "${LOG_DIR}"

if [[ -f "${BACKEND_DIR}/venv/bin/activate" ]]; then
  # shellcheck source=/dev/null
  source "${BACKEND_DIR}/venv/bin/activate"
fi

cd "${BACKEND_DIR}"

{
  echo "=== $(date -u '+%Y-%m-%dT%H:%M:%SZ') generate_court_slots ==="
  python manage.py generate_court_slots --prune "$@"
  echo
} >> "${LOG_FILE}" 2>&1
