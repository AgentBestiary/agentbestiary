#!/bin/bash
# Approve + list our new Bestiary pieces on the market.
export PATH="$HOME/.npm-global/bin:$PATH"
W=0xdcdB85c9CaD6aaf82528C60FC36ED1F9cBF6c732
NFT=0x70e4F0Afb1F0F8E7F99b67F5A25Ab56f132f1eD7
MK=0x68aC78f59c30D749f4D5168662A4Aa44D3b92117

run_call () {
  local label="$1" to="$2" data="$3"
  local pv rid code ex
  pv=$(baw contract-call preview --binanceChainId 56 --from $W --to "$to" --inputData "$data" --value 0 --json 2>&1)
  rid=$(printf '%s' "$pv" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['requestId'])" 2>/dev/null)
  code=$(printf '%s' "$pv" | python3 -c "import sys,json;print(json.load(sys.stdin)['data'].get('simulationResult',{}).get('simulationCode'))" 2>/dev/null)
  if [ -z "$rid" ]; then echo "$label PREVIEW FAIL"; printf '%s' "$pv" | head -3; return; fi
  if [ "$code" != "000000000" ]; then echo "$label SIM FAIL ($code)"; return; fi
  ex=$(baw contract-call execute --requestId "$rid" --json 2>&1)
  printf '%s' "$ex" | python3 -c "import sys,json;d=json.load(sys.stdin);print('$label', d['data']['status'], d['data']['txHash'])" 2>/dev/null || printf '%s' "$ex" | head -2
  sleep 7
}

for pair in "165:0.0010" "166:0.0010" "168:0.0015" "170:0.0010"; do
  id=${pair%%:*}; price=${pair##*:}
  approve=$(node -e "const{ethers}=require('/home/ubuntu/projects/lodepass/node_modules/ethers');const i=new ethers.Interface(['function approve(address,uint256)']);console.log(i.encodeFunctionData('approve',['$MK',$id]))")
  run_call "approve#$id" "$NFT" "$approve"
  list=$(node -e "const{ethers}=require('/home/ubuntu/projects/lodepass/node_modules/ethers');const i=new ethers.Interface(['function list(uint256,uint256,uint256)']);console.log(i.encodeFunctionData('list',[$id,ethers.parseEther('$price'),7]))")
  run_call "list#$id@$price" "$MK" "$list"
done
