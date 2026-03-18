// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "../interfaces/IModule.sol";
import "../interfaces/IModularCompliance.sol";
import "../libraries/Constants.sol";

contract ModularCompliance is Initializable, UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable, IModularCompliance {
    address private _tokenBound;
    address[] private _modules;
    mapping(address => bool) private _moduleBound;
    mapping(address => bool) private _tokenAgents;

    event ModuleFunctionCalled(address indexed module, bytes4 selector, bool success);
    event TokenAgentAdded(address indexed agent);
    event TokenAgentRemoved(address indexed agent);

    error TokenAlreadyBound();
    error TokenNotBound();
    error ModuleAlreadyBound();
    error ModuleNotBound();
    error TooManyModules();
    error ZeroAddress();
    error Unauthorized();
    error OnlyBoundToken();
    error NotTokenAgent();

    modifier onlyToken() {
        if (msg.sender != _tokenBound) revert OnlyBoundToken();
        _;
    }

    modifier onlyTokenAgent() {
        if (!_tokenAgents[msg.sender] && msg.sender != owner()) revert NotTokenAgent();
        _;
    }

    function initialize(address _owner) external initializer {
        if (_owner == address(0)) revert ZeroAddress();
        __Ownable_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
         _transferOwnership(_owner);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ============ Token Binding ============

    function bindToken(address _token) external override {
        if (_token == address(0)) revert ZeroAddress();
        if (_tokenBound != address(0)) revert TokenAlreadyBound();
        if (msg.sender != owner() && msg.sender != _token) revert Unauthorized();

        _tokenBound = _token;
        emit TokenBound(_token);
    }

    function unbindToken() external override onlyOwner {
        if (_tokenBound == address(0)) revert TokenNotBound();
        address oldToken = _tokenBound;
        _tokenBound = address(0);
        emit TokenUnbound(oldToken);
    }

    // ============ Module Management ============

    function addModule(address _module) external override onlyOwner {
        if (_module == address(0)) revert ZeroAddress();
        if (_moduleBound[_module]) revert ModuleAlreadyBound();
        if (_modules.length >= Constants.MAX_MODULES) revert TooManyModules();

        _moduleBound[_module] = true;
        _modules.push(_module);
        IModule(_module).bindCompliance(address(this));

        emit ModuleAdded(_module);
    }

    function removeModule(address _module) external override onlyOwner {
        if (!_moduleBound[_module]) revert ModuleNotBound();

        _moduleBound[_module] = false;

        uint256 length = _modules.length;
        for (uint256 i = 0; i < length; ++i) {
            if (_modules[i] == _module) {
                _modules[i] = _modules[length - 1];
                _modules.pop();
                break;
            }
        }

        IModule(_module).unbindCompliance(address(this));
        emit ModuleRemoved(_module);
    }

    function callModuleFunction(bytes calldata _callData, address _module) external override onlyOwner {
        if (!_moduleBound[_module]) revert ModuleNotBound();
        (bool success, ) = _module.call(_callData);
        emit ModuleFunctionCalled(_module, bytes4(_callData[:4]), success);
    }

    // ============ Agent Management ============

    function addTokenAgent(address _agent) external onlyOwner {
        if (_agent == address(0)) revert ZeroAddress();
        _tokenAgents[_agent] = true;
        emit TokenAgentAdded(_agent);
    }

    function removeTokenAgent(address _agent) external onlyOwner {
        _tokenAgents[_agent] = false;
        emit TokenAgentRemoved(_agent);
    }

    // ============ Compliance Checks ============

    function canTransfer(address _from, address _to, uint256 _value) external view override returns (bool) {
        if (paused()) return false;

        uint256 length = _modules.length;
        for (uint256 i = 0; i < length; ++i) {
            if (!IModule(_modules[i]).moduleCheck(_from, _to, _value, address(this))) {
                return false;
            }
        }
        return true;
    }

    // ============ Transfer Hooks (Called by Token) ============

    function transferred(address _from, address _to, uint256 _value) external override onlyToken {
        uint256 length = _modules.length;
        for (uint256 i = 0; i < length; ++i) {
            IModule(_modules[i]).moduleTransferAction(_from, _to, _value, address(this));
        }
    }

    function created(address _to, uint256 _value) external override onlyToken {
        uint256 length = _modules.length;
        for (uint256 i = 0; i < length; ++i) {
            IModule(_modules[i]).moduleMintAction(_to, _value, address(this));
        }
    }

    function destroyed(address _from, uint256 _value) external override onlyToken {
        uint256 length = _modules.length;
        for (uint256 i = 0; i < length; ++i) {
            IModule(_modules[i]).moduleBurnAction(_from, _value, address(this));
        }
    }

    // ============ View Functions ============

    function getTokenBound() external view override returns (address) {
        return _tokenBound;
    }

    function getModules() external view override returns (address[] memory) {
        return _modules;
    }

    function isModuleBound(address _module) external view override returns (bool) {
        return _moduleBound[_module];
    }

    function getModuleCount() external view returns (uint256) {
        return _modules.length;
    }

    function isTokenAgent(address _agent) external view returns (bool) {
        return _tokenAgents[_agent];
    }

    function isTokenBound(address _token) external view returns (bool) {
        return _tokenBound == _token;
    }

    // ============ Pause Functions ============

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}