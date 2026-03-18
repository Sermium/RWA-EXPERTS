// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../../interfaces/IModule.sol";
import "../../interfaces/IModularCompliance.sol";
import "../../interfaces/IRWASecurityToken.sol";
import "../../libraries/Constants.sol";

contract LockupModule is Initializable, UUPSUpgradeable, OwnableUpgradeable, IModule {
    struct Lockup {
        uint256 amount;
        uint256 releaseTime;
        bool released;
    }

    IRWASecurityToken public securityToken;

    mapping(address => bool) private _complianceBound;
    mapping(address => bool) private _moduleEnabled;
    mapping(address => mapping(address => Lockup[])) private _lockups;
    mapping(address => uint256) private _defaultLockupPeriod;

    event ModuleEnabled(address indexed compliance, bool enabled);
    event LockupCreated(address indexed compliance, address indexed account, uint256 amount, uint256 releaseTime);
    event LockupReleased(address indexed compliance, address indexed account, uint256 index);
    event DefaultLockupPeriodSet(address indexed compliance, uint256 period);
    event SecurityTokenUpdated(address indexed oldToken, address indexed newToken);

    error ComplianceNotBound();
    error ComplianceAlreadyBound();
    error InsufficientUnlockedBalance();
    error InvalidLockupPeriod();
    error LockupNotExpired();
    error LockupAlreadyReleased();
    error InvalidLockupIndex();
    error ZeroAddress();
    error ZeroAmount();
    error TooManyLockups();
    error Unauthorized();

    function initialize(address _securityToken) external initializer {
        if (_securityToken == address(0)) revert ZeroAddress();
        __Ownable_init();
        __UUPSUpgradeable_init();
        securityToken = IRWASecurityToken(_securityToken);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function bindCompliance(address _compliance) external override {
        if (_compliance == address(0)) revert ZeroAddress();
        if (_complianceBound[_compliance]) revert ComplianceAlreadyBound();

        address boundToken = IModularCompliance(_compliance).getTokenBound();
        if (msg.sender != owner() && msg.sender != boundToken && msg.sender != _compliance) revert Unauthorized();

        _complianceBound[_compliance] = true;
        _moduleEnabled[_compliance] = true;
        _defaultLockupPeriod[_compliance] = Constants.DEFAULT_LOCKUP_PERIOD;

        emit ComplianceBound(_compliance);
    }

    function unbindCompliance(address _compliance) external override {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        if (msg.sender != owner() && msg.sender != _compliance) revert Unauthorized();

        _complianceBound[_compliance] = false;
        emit ComplianceUnbound(_compliance);
    }

    function isPlugAndPlay() external pure override returns (bool) {
        return true;
    }

    function canComplianceBind(address _compliance) external pure override returns (bool) {
        return _compliance != address(0);
    }

    function setModuleEnabled(address _compliance, bool _enabled) external onlyOwner {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        _moduleEnabled[_compliance] = _enabled;
        emit ModuleEnabled(_compliance, _enabled);
    }

    function setDefaultLockupPeriod(address _compliance, uint256 _period) external onlyOwner {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        if (_period < Constants.MIN_LOCKUP_PERIOD || _period > Constants.MAX_LOCKUP_PERIOD) revert InvalidLockupPeriod();
        _defaultLockupPeriod[_compliance] = _period;
        emit DefaultLockupPeriodSet(_compliance, _period);
    }

    function createLockup(address _compliance, address _account, uint256 _amount, uint256 _releaseTime) external onlyOwner {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        if (_account == address(0)) revert ZeroAddress();
        if (_amount == 0) revert ZeroAmount();
        if (_releaseTime <= block.timestamp) revert InvalidLockupPeriod();
        if (_lockups[_compliance][_account].length >= Constants.MAX_LOCKUPS_PER_USER) revert TooManyLockups();

        _lockups[_compliance][_account].push(Lockup({
            amount: _amount,
            releaseTime: _releaseTime,
            released: false
        }));

        emit LockupCreated(_compliance, _account, _amount, _releaseTime);
    }

    function releaseLockup(address _compliance, address _account, uint256 _index) external {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();

        Lockup[] storage userLockups = _lockups[_compliance][_account];
        if (_index >= userLockups.length) revert InvalidLockupIndex();

        Lockup storage lockup = userLockups[_index];
        if (lockup.released) revert LockupAlreadyReleased();
        if (block.timestamp < lockup.releaseTime) revert LockupNotExpired();

        lockup.released = true;
        emit LockupReleased(_compliance, _account, _index);
    }

    function moduleCheck(address _from, address, uint256 _value, address _compliance) external view override returns (bool) {
        if (!_complianceBound[_compliance]) return true;
        if (!_moduleEnabled[_compliance]) return true;
        if (_from == address(0)) return true;

        uint256 lockedBalance = getLockedBalance(_compliance, _from);
        uint256 totalBalance = securityToken.balanceOf(_from);

        return totalBalance >= lockedBalance + _value;
    }

    function moduleMintAction(address _to, uint256 _amount, address _compliance) external override {
        if (!_complianceBound[_compliance]) return;
        if (!_moduleEnabled[_compliance]) return;
        if (_to == address(0)) return;
        if (_lockups[_compliance][_to].length >= Constants.MAX_LOCKUPS_PER_USER) revert TooManyLockups();

        uint256 lockupPeriod = _defaultLockupPeriod[_compliance];
        if (lockupPeriod > 0) {
            _lockups[_compliance][_to].push(Lockup({
                amount: _amount,
                releaseTime: block.timestamp + lockupPeriod,
                released: false
            }));
            emit LockupCreated(_compliance, _to, _amount, block.timestamp + lockupPeriod);
        }
    }

    function moduleBurnAction(address, uint256, address) external override {}
    function moduleTransferAction(address, address, uint256, address) external override {}

    function getLockedBalance(address _compliance, address _account) public view returns (uint256) {
        Lockup[] storage userLockups = _lockups[_compliance][_account];
        uint256 locked = 0;
        uint256 length = userLockups.length;

        for (uint256 i = 0; i < length; ++i) {
            if (!userLockups[i].released && block.timestamp < userLockups[i].releaseTime) {
                locked += userLockups[i].amount;
            }
        }
        return locked;
    }

    function getUnlockedBalance(address _compliance, address _account) external view returns (uint256) {
        uint256 total = securityToken.balanceOf(_account);
        uint256 locked = getLockedBalance(_compliance, _account);
        return total > locked ? total - locked : 0;
    }

    function getLockups(address _compliance, address _account) external view returns (Lockup[] memory) { return _lockups[_compliance][_account]; }
    function getLockupCount(address _compliance, address _account) external view returns (uint256) { return _lockups[_compliance][_account].length; }
    function isComplianceBound(address _compliance) external view override returns (bool) { return _complianceBound[_compliance]; }
    function isModuleEnabled(address _compliance) external view returns (bool) { return _moduleEnabled[_compliance]; }
    function getDefaultLockupPeriod(address _compliance) external view returns (uint256) { return _defaultLockupPeriod[_compliance]; }
    function name() external pure override returns (string memory) { return "LockupModule"; }

    function setSecurityToken(address _token) external onlyOwner {
        if (_token == address(0)) revert ZeroAddress();
        address oldToken = address(securityToken);
        securityToken = IRWASecurityToken(_token);
        emit SecurityTokenUpdated(oldToken, _token);
    }
}
