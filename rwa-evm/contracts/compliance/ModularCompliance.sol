// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "../interfaces/IModularCompliance.sol";
import "../interfaces/IModule.sol";
import "../libraries/Constants.sol";

contract ModularCompliance is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    PausableUpgradeable, 
    IModularCompliance 
{
    // ============ State Variables ============
    address private _boundToken;
    address[] private _modules;
    mapping(address => bool) private _moduleBound;

    // ============ Custom Errors ============
    error ModuleAlreadyBound();
    error ModuleNotBound();
    error TokenAlreadyBound();
    error TokenNotBound();
    error InvalidModule();
    error InvalidToken();
    error MaxModulesReached();
    error UnauthorizedCaller();
    error ModuleCallFailed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _admin) external initializer {
        if (_admin == address(0)) revert InvalidToken();
        __Ownable_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        _transferOwnership(_admin);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ============ Explicit Overrides for Solidity ============
    
    function owner() public view override(OwnableUpgradeable, IModularCompliance) returns (address) {
        return OwnableUpgradeable.owner();
    }

    function transferOwnership(address newOwner) public override(OwnableUpgradeable, IModularCompliance) onlyOwner {
        OwnableUpgradeable.transferOwnership(newOwner);
    }

    // ============ Module Management ============

    function addModule(address _module) external override onlyOwner whenNotPaused {
        if (_module == address(0)) revert InvalidModule();
        if (_moduleBound[_module]) revert ModuleAlreadyBound();
        if (_modules.length >= Constants.MAX_MODULES) revert MaxModulesReached();

        try IModule(_module).name() returns (string memory) {
        } catch {
            revert InvalidModule();
        }

        _modules.push(_module);
        _moduleBound[_module] = true;

        try IModule(_module).bindCompliance(address(this)) {} catch {}

        emit ModuleAdded(_module);
    }

    function removeModule(address _module) external override onlyOwner whenNotPaused {
        if (!_moduleBound[_module]) revert ModuleNotBound();

        try IModule(_module).unbindCompliance(address(this)) {} catch {}

        for (uint256 i = 0; i < _modules.length; i++) {
            if (_modules[i] == _module) {
                _modules[i] = _modules[_modules.length - 1];
                _modules.pop();
                break;
            }
        }

        _moduleBound[_module] = false;
        emit ModuleRemoved(_module);
    }

    function isModuleBound(address _module) external view override returns (bool) {
        return _moduleBound[_module];
    }

    function getModules() external view override returns (address[] memory) {
        return _modules;
    }

    // ============ Token Binding ============

    function bindToken(address _token) external override whenNotPaused {
        if (_token == address(0)) revert InvalidToken();
        if (_boundToken != address(0)) revert TokenAlreadyBound();
        
        if (msg.sender != owner() && msg.sender != _token) revert UnauthorizedCaller();

        _boundToken = _token;
        emit TokenBound(_token);
    }

    function unbindToken() external override onlyOwner whenNotPaused {
        if (_boundToken == address(0)) revert TokenNotBound();
        
        address oldToken = _boundToken;
        _boundToken = address(0);
        emit TokenUnbound(oldToken);
    }

    function getTokenBound() external view override returns (address) {
        return _boundToken;
    }

    // ============ Compliance Checks ============

    function canTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) external view override returns (bool) {
        for (uint256 i = 0; i < _modules.length; i++) {
            if (!IModule(_modules[i]).moduleCheck(_from, _to, _amount, address(this))) {
                return false;
            }
        }
        return true;
    }

    function transferred(
        address _from,
        address _to,
        uint256 _amount
    ) external override {
        if (msg.sender != _boundToken) revert UnauthorizedCaller();
        
        for (uint256 i = 0; i < _modules.length; i++) {
            try IModule(_modules[i]).moduleTransferAction(_from, _to, _amount, address(this)) {} catch {}
        }
    }

    function created(address _to, uint256 _amount) external override {
        if (msg.sender != _boundToken) revert UnauthorizedCaller();
        
        for (uint256 i = 0; i < _modules.length; i++) {
            try IModule(_modules[i]).moduleMintAction(_to, _amount, address(this)) {} catch {}
        }
    }

    function destroyed(address _from, uint256 _amount) external override {
        if (msg.sender != _boundToken) revert UnauthorizedCaller();
        
        for (uint256 i = 0; i < _modules.length; i++) {
            try IModule(_modules[i]).moduleBurnAction(_from, _amount, address(this)) {} catch {}
        }
    }

    // ============ Module Interaction ============

    function callModuleFunction(
        bytes calldata _callData,
        address _module
    ) external override onlyOwner {
        if (!_moduleBound[_module]) revert ModuleNotBound();
        
        (bool success, ) = _module.call(_callData);
        if (!success) revert ModuleCallFailed();
    }

    // ============ Pause ============

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}