#!/bin/zsh
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  runtime_node="$(command -v node)"
else
  runtime_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [[ ! -x "$runtime_node" || ! -f node_modules/vite/bin/vite.js ]]; then
  print 'Node.js 22.12以降と依存パッケージが必要。README.mdのセットアップ手順を確認してね。'
  read -k 1
  exit 1
fi
print 'Macで開く: http://127.0.0.1:5173/ （終了: Control+C）'
exec "$runtime_node" node_modules/vite/bin/vite.js --host 127.0.0.1 "$@"
