#!/usr/bin/env python3
"""Verify Agent Bestiary contracts on BscScan via Etherscan V2 API (standard JSON input)."""
import glob
import json
import os
import sys
import time
import urllib.parse
import urllib.request

API = "https://api.etherscan.io/v2/api?chainid=56"
KEY = open("/home/ubuntu/.etherscan.key").read().strip()

NFT = "0x70e4F0Afb1F0F8E7F99b67F5A25Ab56f132f1eD7"
MARKET = "0x68aC78f59c30D749f4D5168662A4Aa44D3b92117"
TREASURY = "0x76567BeFC21816f1e2D7Cb2b5c9e0a5D37a5D4a0"
REGISTRY = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F"
PRICE = 300000000000000
REVEAL_BLOCK = 129823345
COMMIT = "0xe6ec895f37a245d4c0576f5ca9173db0e68ca4a75eaef1702b5bf98a7fbfb8aa"


def post(params):
    body = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(API, data=body)
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode())


def get(params):
    url = API + "&" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=90) as r:
        return json.loads(r.read().decode())


def build_info_for(contract_path):
    for f in glob.glob("/home/ubuntu/projects/mint3/artifacts/build-info/*.json"):
        info = json.load(open(f))
        if contract_path in info.get("input", {}).get("sources", {}):
            return info
    raise SystemExit(f"build-info not found for {contract_path}")


def encode_args(types, values):
    from eth_abi import encode  # eth-abi ships with web3; fallback below if missing
    return encode(types, values).hex()


def verify(address, contract_name, contract_path, constructor_types, constructor_values, label):
    info = build_info_for(contract_path)
    std_input = info["input"]
    version = "v" + info["solcLongVersion"] if not info["solcVersion"].startswith("v") else info["solcLongVersion"]
    if not version.startswith("v"):
        version = "v" + version

    args_hex = ""
    if constructor_types:
        args_hex = encode_args(constructor_types, constructor_values)

    print(f"\n== {label} {address}")
    print("compiler:", version, "| files:", len(std_input["sources"]))

    res = post({
        "module": "contract",
        "action": "verifysourcecode",
        "apikey": KEY,
        "contractaddress": address,
        "sourceCode": json.dumps(std_input),
        "codeformat": "solidity-standard-json-input",
        "contractname": f"{contract_path}:{contract_name}",
        "compilerversion": version,
        "constructorArguements": args_hex,
    })
    print("submit:", res.get("status"), res.get("result") or res.get("message"))
    guid = res.get("result")
    if res.get("status") != "1":
        return False

    for _ in range(20):
        time.sleep(6)
        st = get({"module": "contract", "action": "checkverifystatus", "guid": guid, "apikey": KEY})
        result = str(st.get("result"))
        print("  status:", result[:120])
        if "Pass" in result or "Verified" in result or "Already Verified" in result:
            return True
        if "Fail" in result or "Error" in result:
            return False
    return False


if __name__ == "__main__":
    ok_nft = verify(
        NFT, "AgentBestiary", "contracts/AgentBestiary.sol",
        ["address", "address", "uint256", "uint256", "bytes32"],
        [REGISTRY, TREASURY, PRICE, REVEAL_BLOCK, bytes.fromhex(COMMIT[2:])],
        "AgentBestiary (NFT)",
    )
    ok_mk = verify(
        MARKET, "BestiaryMarket", "contracts/BestiaryMarket.sol",
        ["address", "address"], [NFT, TREASURY], "BestiaryMarket",
    )
    print("\nRESULT nft:", ok_nft, "| market:", ok_mk)
