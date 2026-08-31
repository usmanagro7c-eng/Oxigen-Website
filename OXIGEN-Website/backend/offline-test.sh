#!/bin/bash
# Run a backend instance pointing at an unreachable ERPNext to test signup queue fallback
export ERPNEXT_URL="http://127.0.0.1:9"   # nothing listens here — connection refused quickly
export PORT=3006
export NODE_ENV=development
npx tsx src/index.ts > /tmp/backend-offline.log 2>&1 &
BGPID=$!
sleep 6
echo "=== offline backend health ==="
curl -s -m 8 http://localhost:3006/health -o /dev/null -w "health HTTP %{http_code}\n"
echo "=== signup with ERPNext unreachable ==="
curl -s -m 15 -X POST http://localhost:3006/api/auth/signup -H "Content-Type: application/json" -d '{"email":"offline-test@oxigen.pk","full_name":"Offline Test"}' 
echo ""
echo "=== check queue ==="
tail -5 /tmp/backend-offline.log
kill $BGPID 2>/dev/null
