// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface IRWASecurityToken {

    function MINTER_ROLE() external view returns (bytes32);
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;
    // ERC20 Standard
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);

    // Snapshot
    function balanceOfAt(address account, uint256 snapshotId) external view returns (uint256);
    function totalSupplyAt(uint256 snapshotId) external view returns (uint256);
    function getCurrentSnapshotId() external view returns (uint256);
    function getSnapshotBlock(uint256 snapshotId) external view returns (uint256);
    function snapshot() external returns (uint256);

    // Mint/Burn
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function batchMint(address[] calldata toList, uint256[] calldata amounts) external;
    function batchBurn(address[] calldata userAddresses, uint256[] calldata amounts) external;

    // ERC-3643 Token Info
    function setName(string calldata name) external;
    function setSymbol(string calldata symbol) external;
    function setOnchainID(address onchainID) external;
    function onchainID() external view returns (address);
    function version() external view returns (string memory);

    // ERC-3643 Freeze
    function setAddressFrozen(address userAddress, bool freeze) external;
    function freezePartialTokens(address userAddress, uint256 amount) external;
    function unfreezePartialTokens(address userAddress, uint256 amount) external;
    function batchSetAddressFrozen(address[] calldata userAddresses, bool[] calldata freeze) external;
    function batchFreezePartialTokens(address[] calldata userAddresses, uint256[] calldata amounts) external;
    function batchUnfreezePartialTokens(address[] calldata userAddresses, uint256[] calldata amounts) external;
    function isFrozen(address userAddress) external view returns (bool);
    function getFrozenTokens(address userAddress) external view returns (uint256);
    function getUnfrozenBalance(address userAddress) external view returns (uint256);

    // ERC-3643 Forced Transfer & Recovery
    function forcedTransfer(address from, address to, uint256 amount) external returns (bool);
    function batchForcedTransfer(address[] calldata fromList, address[] calldata toList, uint256[] calldata amounts) external;
    function recoveryAddress(address lostWallet, address newWallet, address investorOnchainID) external returns (bool);
    function batchTransfer(address[] calldata toList, uint256[] calldata amounts) external;

    // Compliance & Registry
    function setCompliance(address compliance) external;
    function setIdentityRegistry(address identityRegistry) external;
    function compliance() external view returns (address);
    function identityRegistry() external view returns (address);

    // Pause
    function pause() external;
    function unpause() external;
}