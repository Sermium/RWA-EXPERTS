// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../../interfaces/IModule.sol";
import "../../interfaces/IModularCompliance.sol";
import "../../libraries/Constants.sol";

contract TransferFeesModule is Initializable, UUPSUpgradeable, OwnableUpgradeable, IModule {
    mapping(address => bool) private _complianceBound;
    mapping(address => bool) private _moduleEnabled;
    mapping(address => uint256) private _transferFeeBps;
    mapping(address => address) private _feeRecipient;
    mapping(address => mapping(address => bool)) private _feeExempt;

    uint256 public collectedFees;

    event ModuleEnabled(address indexed compliance, bool enabled);
    event TransferFeeSet(address indexed compliance, uint256 feeBps);
    event FeeRecipientSet(address indexed compliance, address recipient);
    event AddressExempted(address indexed compliance, address indexed account, bool exempt);
    event FeeCollected(address indexed compliance, address indexed from, uint256 amount);

    error ComplianceNotBound();
    error ComplianceAlreadyBound();
    error FeeTooHigh();
    error ZeroAddress();
    error BatchTooLarge();
    error Unauthorized();

    function initialize() external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
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
        _transferFeeBps[_compliance] = Constants.EXCHANGE_FEE_BPS;
        _feeRecipient[_compliance] = owner();

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

    function setTransferFee(address _compliance, uint256 _feeBps) external onlyOwner {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        if (_feeBps > Constants.MAX_FEE_BPS) revert FeeTooHigh();
        _transferFeeBps[_compliance] = _feeBps;
        emit TransferFeeSet(_compliance, _feeBps);
    }

    function setFeeRecipient(address _compliance, address _recipient) external onlyOwner {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        if (_recipient == address(0)) revert ZeroAddress();
        _feeRecipient[_compliance] = _recipient;
        emit FeeRecipientSet(_compliance, _recipient);
    }

    function setAddressExempt(address _compliance, address _account, bool _exempt) external onlyOwner {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        if (_account == address(0)) revert ZeroAddress();
        _feeExempt[_compliance][_account] = _exempt;
        emit AddressExempted(_compliance, _account, _exempt);
    }

    function batchSetAddressExempt(address _compliance, address[] calldata _accounts, bool _exempt) external onlyOwner {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        if (_accounts.length > Constants.MAX_BATCH_SIZE) revert BatchTooLarge();

        uint256 length = _accounts.length;
        for (uint256 i = 0; i < length; ++i) {
            if (_accounts[i] != address(0)) {
                _feeExempt[_compliance][_accounts[i]] = _exempt;
                emit AddressExempted(_compliance, _accounts[i], _exempt);
            }
        }
    }

    function moduleCheck(address, address, uint256, address) external pure override returns (bool) { return true; }
    function moduleMintAction(address, uint256, address) external override {}
    function moduleBurnAction(address, uint256, address) external override {}

    function moduleTransferAction(address _from, address, uint256 _value, address _compliance) external override {
        if (!_complianceBound[_compliance]) return;
        if (!_moduleEnabled[_compliance]) return;
        if (_feeExempt[_compliance][_from]) return;

        uint256 fee = calculateFee(_compliance, _value);
        if (fee > 0) {
            collectedFees += fee;
            emit FeeCollected(_compliance, _from, fee);
        }
    }

    function calculateFee(address _compliance, uint256 _amount) public view returns (uint256) {
        if (!_moduleEnabled[_compliance]) return 0;
        uint256 fee = (_amount * _transferFeeBps[_compliance]) / Constants.BPS_DENOMINATOR;
        return fee < Constants.MIN_FEE ? Constants.MIN_FEE : fee;
    }

    function isComplianceBound(address _compliance) external view override returns (bool) { return _complianceBound[_compliance]; }
    function isModuleEnabled(address _compliance) external view returns (bool) { return _moduleEnabled[_compliance]; }
    function getTransferFee(address _compliance) external view returns (uint256) { return _transferFeeBps[_compliance]; }
    function getFeeRecipient(address _compliance) external view returns (address) { return _feeRecipient[_compliance]; }
    function isExempt(address _compliance, address _account) external view returns (bool) { return _feeExempt[_compliance][_account]; }
    function name() external pure override returns (string memory) { return "TransferFeesModule"; }
}