#!/bin/bash

trap 'kill $SERVER_PID 2>/dev/null; exit 0' SIGINT EXIT

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "====================================="
echo "🎮 Excuse Me Sir 원터치 서버 시작"
echo "====================================="

echo "📦 1. 프론트엔드 빌드..."
cd "$SCRIPT_DIR/client" && npm run build && cd "$SCRIPT_DIR"

echo "🚀 2. 백엔드 서버 시작..."
cd "$SCRIPT_DIR/server" && node index.js &
SERVER_PID=$!
cd "$SCRIPT_DIR"
sleep 1

echo "🔑 터널 비밀번호: $(curl -s https://loca.lt/mytunnelpassword)"
echo ""
echo "🌐 3. 인터넷 터널 시작 (아래 주소가 접속 링크입니다)..."
echo "====================================="
npx localtunnel --port 3001
