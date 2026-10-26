#!/bin/bash
# Mint 4 paid pieces on Agent Bestiary from the .ai agentic wallet.
export PATH="$HOME/.npm-global/bin:$PATH"
W=0xdcdB85c9CaD6aaf82528C60FC36ED1F9cBF6c732
NFT=0x70e4F0Afb1F0F8E7F99b67F5A25Ab56f132f1eD7
VALUE=300000000000000

for i in 1 2 3 4; do
  echo "--- mint $i/4"
  pv=$(baw contract-call preview --binanceChainId 56 --from $W --to $NFT --inputData 0x1249c58b --value $VALUE --json 2>&1)
  rid=$(printf '%s' "$pv" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['data']['requestId'])" 2>/dev/null)
  code=$(printf '%s' "$pv" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['data'].get('simulationResult',{}).get('simulationCode'))" 2>/dev/null)
  echo "sim=$code"
  if [ -z "$rid" ]; then echo "PREVIEW GAGAL"; printf '%s' "$pv" | head -3; continue; fi
  if [ "$code" != "000000000" ]; then echo "SIMULASI GAGAL skip"; continue; fi
  ex=$(baw contract-call execute --requestId "$rid" --json 2>&1)
  printf '%s' "$ex" | python3 -c "import sys,json;d=json.load(sys.stdin);print('tx',d['data']['status'],d['data']['txHash'])" 2>/dev/null || printf '%s' "$ex" | head -3
  sleep 8
done
