// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// Test double for the Binance Agent ID registry surface we rely on.
contract MockAgentRegistry {
    mapping(address => string) public handleOf;
    mapping(address => uint256) public balanceOf;

    function setAgent(address wallet, string calldata handle) external {
        handleOf[wallet] = handle;
        balanceOf[wallet] = bytes(handle).length > 0 ? 1 : 0;
    }
}
