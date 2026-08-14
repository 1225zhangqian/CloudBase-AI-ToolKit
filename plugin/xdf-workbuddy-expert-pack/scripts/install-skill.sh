#!/usr/bin/env bash
# Install XDF expert-pack skills onto the local WorkBuddy / CodeBuddy skill surface
# so Skill("<id>") resolves before CloudBase connector Trust.
#
# Usage (from repo root or this pack directory):
#   bash plugin/xdf-workbuddy-expert-pack/scripts/install-skill.sh
#   bash scripts/install-skill.sh
#   bash scripts/install-skill.sh cloudbase-auth-bootstrap   # one skill only
#
# Destinations (created if missing):
#   ~/.workbuddy/skills/<skill-id>
#   ~/.codebuddy/skills/<skill-id>   (when that home exists)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACK_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SKILLS_ROOT="${PACK_ROOT}/skills"

# Default: install all skills that ship a SKILL.md under skills/
DEFAULT_SKILLS=(
  minimal-web-baas-demo
  cloudbase-auth-bootstrap
)

if [[ $# -gt 0 ]]; then
  SKILL_IDS=("$@")
else
  SKILL_IDS=("${DEFAULT_SKILLS[@]}")
fi

install_one_skill() {
  local skill_id="$1"
  local src="${SKILLS_ROOT}/${skill_id}"
  if [[ ! -f "${src}/SKILL.md" ]]; then
    echo "ERROR: missing ${src}/SKILL.md" >&2
    return 1
  fi

  install_to() {
    local dest_root="$1"
    local label="$2"
    local dest="${dest_root}/${skill_id}"
    mkdir -p "${dest_root}"
    rm -rf "${dest}"
    mkdir -p "${dest}"
    if command -v rsync >/dev/null 2>&1; then
      rsync -a --delete "${src}/" "${dest}/"
    else
      cp -R "${src}/." "${dest}/"
    fi
    echo "Installed ${skill_id} → ${dest} (${label})"
  }

  install_to "${HOME}/.workbuddy/skills" "WorkBuddy"
  if [[ -d "${HOME}/.codebuddy" ]]; then
    install_to "${HOME}/.codebuddy/skills" "CodeBuddy"
  fi
}

for id in "${SKILL_IDS[@]}"; do
  install_one_skill "${id}"
done

echo
echo "Verify (expect SKILL.md):"
for id in "${SKILL_IDS[@]}"; do
  echo "  ls ~/.workbuddy/skills/${id}/SKILL.md"
done
echo "Then start a new WorkBuddy session and call Skill(\"<id>\")."
