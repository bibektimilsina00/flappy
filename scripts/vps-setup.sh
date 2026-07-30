#!/usr/bin/env bash
# One-time VPS bootstrap. Run as root on the server:
#   curl -fsSL https://raw.githubusercontent.com/bibektimilsina00/riocut/main/scripts/vps-setup.sh | bash
set -euo pipefail

command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh

# 2GB swap — the box is small and whisper transcription is hungry.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

mkdir -p /opt/riocut
cd /opt/riocut

if [ ! -f .env ]; then
  curl -fsSL https://raw.githubusercontent.com/bibektimilsina00/riocut/main/deploy/env.prod.example -o .env
  chmod 600 .env
  echo ">>> /opt/riocut/.env created from template."
  echo ">>> EDIT IT NOW — replace every change-me with real secrets (openssl rand -hex 32)."
fi

# Basic firewall: ssh + the three public ports (web, api, minio).
if command -v ufw >/dev/null; then
  ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 8000/tcp && ufw allow 9000/tcp
  ufw --force enable
fi

echo ">>> Done. Fill /opt/riocut/.env, add the VPS_SSH_KEY secret on GitHub, then push to main."
