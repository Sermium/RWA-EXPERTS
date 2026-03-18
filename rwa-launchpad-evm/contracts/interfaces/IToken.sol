// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface IToken {

    event AddressFrozen(address indexed account, bool indexed isFrozen, address indexed agent);
    event TokensFrozen(address indexed account, uint256 amount);
    event TokensUnfrozen(address indexed account, uint256 amount);
    event RecoverySuccess(address indexed lostWallet, address indexed newWallet, address indexed agent);
    event IdentityRegistryAdded(address indexed identityRegistry);
    event ComplianceAdded(address indexed compliance);

    function mint(address to, uint256 amount) external;
    function batchMint(address[] calldata toList, uint256[] calldata amounts) external;
    function burn(uint256 amount) external;
    function batchBurn(address[] calldata accounts, uint256[] calldata amounts) external;
    function batchTransfer(address[] calldata toList, uint256[] calldata amounts) external;
    function forcedTransfer(address from, address to, uint256 amount) external returns (bool);
    function batchForcedTransfer(address[] calldata fromList, address[] calldata toList, uint256[] calldata amounts) external;
    function recoveryAddress(address lostWallet, address newWallet, address investorOnchainID) external returns (bool);
    function setAddressFrozen(address account, bool freeze) external;
    function batchSetAddressFrozen(address[] calldata accounts, bool[] calldata freezeStatus) external;
    function freezePartialTokens(address account, uint256 amount) external;
    function batchFreezePartialTokens(address[] calldata accounts, uint256[] calldata amounts) external;
    function unfreezePartialTokens(address account, uint256 amount) external;
    function batchUnfreezePartialTokens(address[] calldata accounts, uint256[] calldata amounts) external;
    function setIdentityRegistry(address identityRegistry) external;
    function setCompliance(address compliance) external;
    function pause() external;
    function unpause() external;
    function identityRegistry() external view returns (address);
    function compliance() external view returns (address);
    function isFrozen(address account) external view returns (bool);
    function getFrozenTokens(address account) external view returns (uint256);
}