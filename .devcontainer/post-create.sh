#!/usr/bin/env bash
set -euo pipefail

# Docker creates named volumes as root, so hand the Claude config dir to the dev user
sudo chown -R vscode:vscode /home/vscode/.claude

npm install

if [ -s requirements.txt ]; then
  pip install --user -r requirements.txt
fi
