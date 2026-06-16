#!/usr/bin/env bash
# Run due system transaction transitions (payment expiry, booking completion).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${BACKEND_DIR}/logs"
LOG_FILE="${LOG_DIR}/process_transaction_transitions.log"

mkdir -p "${LOG_DIR}"

if [[ -f "${BACKEND_DIR}/venv/bin/activate" ]]; then
  # shellcheck source=/dev/null
  source "${BACKEND_DIR}/venv/bin/activate"
fi

cd "${BACKEND_DIR}"

{
  echo "=== $(date -u '+%Y-%m-%dT%H:%M:%SZ') process_transaction_transitions ==="
  python manage.py process_transaction_transitions
  echo
} >> "${LOG_FILE}" 2>&1
