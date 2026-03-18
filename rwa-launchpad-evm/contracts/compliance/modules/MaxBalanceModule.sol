// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../../interfaces/IModule.sol";
import "../../interfaces/IModularCompliance.sol";
import "../../interfaces/IRWASecurityToken.sol";
import "../../libraries/Constants.sol";

contract MaxBalanceModule is Initializable, UUPSUpgradeable, OwnableUpgradeable, IModule {
    IRWASecurityToken public securityToken;

    mapping(address => bool) private _complianceBound;
    mapping(address => bool) private _moduleEnabled;
    mapping(address => uint256) private _defaultMaxBalance;
    mapping(address => mapping(address => uint256)) private _customMaxBalance;
    mapping(address => mapping(address => bool)) private _exemptAddresses;

    event ModuleEnabled(address indexed compliance, bool enabled);
    event DefaultMaxBalanceSet(address indexed compliance, uint256 maxBalance);
    event CustomMaxBalanceSet(address indexed compliance, address indexed account, uint256 maxBalance);
    event AddressExempted(address indexed compliance, address indexed account, bool exempt);
    event SecurityTokenUpdated(address indexed oldToken, address indexed newToken);

    error ComplianceNotBound();
    error ComplianceAlreadyBound();
    error BalanceExceeded();
    error ZeroAddress();
    error InvalidMaxBalance();
    error Unauthorized();

    function initialize(address _securityToken) external initializer {
        if (_securityToken == address(0)) revert ZeroAddress();
        __Ownable_init();
        __UUPSUpgradeable_init();
        securityToken = IRWASecurityToken(_securityToken);
    }

    function isPlugAndPlay() external pure override returns (bool) {
        return true;
    }

    function canComplianceBind(address _compliance) external pure override returns (bool) {
        return _compliance != address(0);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function bindCompliance(address _compliance) external override {
        if (_compliance == address(0)) revert ZeroAddress();
        if (_complianceBound[_compliance]) revert ComplianceAlreadyBound();

        address boundToken = IModularCompliance(_compliance).getTokenBound();
        if (msg.sender != owner() && msg.sender != boundToken && msg.sender != _compliance) revert Unauthorized();

        _complianceBound[_compliance] = true;
        _moduleEnabled[_compliance] = true;
        _defaultMaxBalance[_compliance] = type(uint256).max;

        emit ComplianceBound(_compliance);
    }

    function unbindCompliance(address _compliance) external override {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        if (msg.sender != owner() && msg.sender != _compliance) revert Unauthorized();

        _complianceBound[_compliance] = false;
        emit ComplianceUnbound(_compliance);
    }

    function setModuleEnabled(address _compliance, bool _enabled) external onlyOwner {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        _moduleEnabled[_compliance] = _enabled;
        emit ModuleEnabled(_compliance, _enabled);
    }

    function setDefaultMaxBalance(address _compliance, uint256 _maxBalance) external onlyOwner {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        _defaultMaxBalance[_compliance] = _maxBalance;
        emit DefaultMaxBalanceSet(_compliance, _maxBalance);
    }

    function setCustomMaxBalance(address _compliance, address _account, uint256 _maxBalance) external onlyOwner {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        if (_account == address(0)) revert ZeroAddress();
        _customMaxBalance[_compliance][_account] = _maxBalance;
        emit CustomMaxBalanceSet(_compliance, _account, _maxBalance);
    }

    function setAddressExempt(address _compliance, address _account, bool _exempt) external onlyOwner {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        if (_account == address(0)) revert ZeroAddress();
        _exemptAddresses[_compliance][_account] = _exempt;
        emit AddressExempted(_compliance, _account, _exempt);
    }

    function moduleCheck(address, address _to, uint256 _value, address _compliance) external view override returns (bool) {
        if (!_complianceBound[_compliance]) return true;
        if (!_moduleEnabled[_compliance]) return true;
        if (_to == address(0)) return true;
        if (_exemptAddresses[_compliance][_to]) return true;

        uint256 maxBal = _customMaxBalance[_compliance][_to];
        if (maxBal == 0) maxBal = _defaultMaxBalance[_compliance];

        uint256 currentBalance = securityToken.balanceOf(_to);
        return currentBalance + _value <= maxBal;
    }

    function moduleMintAction(address _to, uint256 _value, address _compliance) external view override {
        if (!_complianceBound[_compliance]) return;
        if (!_moduleEnabled[_compliance]) return;
        if (_exemptAddresses[_compliance][_to]) return;

        uint256 maxBal = _customMaxBalance[_compliance][_to];
        if (maxBal == 0) maxBal = _defaultMaxBalance[_compliance];

        if (securityToken.balanceOf(_to) + _value > maxBal) revert BalanceExceeded();
    }

    function moduleBurnAction(address, uint256, address) external override {}

    function moduleTransferAction(address, address _to, uint256, address _compliance) external view override {
        if (!_complianceBound[_compliance]) return;
        if (!_moduleEnabled[_compliance]) return;
        if (_exemptAddresses[_compliance][_to]) return;

        uint256 maxBal = _customMaxBalance[_compliance][_to];
        if (maxBal == 0) maxBal = _defaultMaxBalance[_compliance];

        if (securityToken.balanceOf(_to) > maxBal) revert BalanceExceeded();
    }

    function isComplianceBound(address _compliance) external view override returns (bool) { return _complianceBound[_compliance]; }
    function isModuleEnabled(address _compliance) external view returns (bool) { return _moduleEnabled[_compliance]; }
    function getDefaultMaxBalance(address _compliance) external view returns (uint256) { return _defaultMaxBalance[_compliance]; }
    function getMaxBalance(address _compliance, address _account) external view returns (uint256) {
        uint256 custom = _customMaxBalance[_compliance][_account];
        return custom > 0 ? custom : _defaultMaxBalance[_compliance];
    }
    function isExempt(address _compliance, address _account) external view returns (bool) { return _exemptAddresses[_compliance][_account]; }
    function name() external pure override returns (string memory) { return "MaxBalanceModule"; }

    function setSecurityToken(address _token) external onlyOwner {
        if (_token == address(0)) revert ZeroAddress();
        address oldToken = address(securityToken);
        securityToken = IRWASecurityToken(_token);
        emit SecurityTokenUpdated(oldToken, _token);
    }
}