// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IIdentityRegistryStorage.sol";
import "../libraries/Constants.sol";

contract IdentityRegistryStorage is Initializable, UUPSUpgradeable, OwnableUpgradeable, IIdentityRegistryStorage {
    struct Identity {
        address identityContract;
        uint16 investorCountry;
    }

    mapping(address => Identity) private _identities;
    mapping(address => bool) private _boundRegistries;
    address[] private _registryList;

    event IdentityStored(address indexed investorAddress, address indexed identity, uint16 country);
    event IdentityRemoved(address indexed investorAddress);
    event IdentityModified(address indexed investorAddress, address indexed newIdentity);
    event CountryModified(address indexed investorAddress, uint16 newCountry);
    event RegistryBound(address indexed registry);
    event RegistryUnbound(address indexed registry);

    error InvalidAddress();
    error IdentityAlreadyStored();
    error IdentityNotStored();
    error RegistryAlreadyBound();
    error RegistryNotBound();
    error TooManyRegistries();
    error OnlyBoundRegistry();

    modifier onlyBoundRegistry() {
        if (!_boundRegistries[msg.sender]) revert OnlyBoundRegistry();
        _;
    }

    function initialize(address _owner) external initializer {
        if (_owner == address(0)) revert InvalidAddress();
        __Ownable_init();
        transferOwnership(_owner);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function bindIdentityRegistry(address _identityRegistry) external override onlyOwner {
        if (_identityRegistry == address(0)) revert InvalidAddress();
        if (_boundRegistries[_identityRegistry]) revert RegistryAlreadyBound();
        if (_registryList.length >= Constants.MAX_IDENTITY_REGISTRIES) revert TooManyRegistries();

        _boundRegistries[_identityRegistry] = true;
        _registryList.push(_identityRegistry);

        emit RegistryBound(_identityRegistry);
    }

    function unbindIdentityRegistry(address _identityRegistry) external override onlyOwner {
        if (!_boundRegistries[_identityRegistry]) revert RegistryNotBound();

        _boundRegistries[_identityRegistry] = false;

        uint256 length = _registryList.length;
        for (uint256 i = 0; i < length; ++i) {
            if (_registryList[i] == _identityRegistry) {
                _registryList[i] = _registryList[length - 1];
                _registryList.pop();
                break;
            }
        }

        emit RegistryUnbound(_identityRegistry);
    }

    function addIdentityToStorage(address _userAddress, address _identity, uint16 _country) external override onlyBoundRegistry {
        if (_userAddress == address(0) || _identity == address(0)) revert InvalidAddress();
        if (_identities[_userAddress].identityContract != address(0)) revert IdentityAlreadyStored();

        _identities[_userAddress] = Identity({ identityContract: _identity, investorCountry: _country });

        emit IdentityStored(_userAddress, _identity, _country);
    }

    function removeIdentityFromStorage(address _userAddress) external override onlyBoundRegistry {
        if (_identities[_userAddress].identityContract == address(0)) revert IdentityNotStored();

        delete _identities[_userAddress];

        emit IdentityRemoved(_userAddress);
    }

    function modifyStoredIdentity(address _userAddress, address _identity) external override onlyBoundRegistry {
        if (_identity == address(0)) revert InvalidAddress();
        if (_identities[_userAddress].identityContract == address(0)) revert IdentityNotStored();

        _identities[_userAddress].identityContract = _identity;

        emit IdentityModified(_userAddress, _identity);
    }

    function modifyStoredInvestorCountry(address _userAddress, uint16 _country) external override onlyBoundRegistry {
        if (_identities[_userAddress].identityContract == address(0)) revert IdentityNotStored();

        _identities[_userAddress].investorCountry = _country;

        emit CountryModified(_userAddress, _country);
    }

    function storedIdentity(address _userAddress) external view override returns (address) { return _identities[_userAddress].identityContract; }
    function storedInvestorCountry(address _userAddress) external view override returns (uint16) { return _identities[_userAddress].investorCountry; }
    function linkedIdentityRegistries() external view override returns (address[] memory) { return _registryList; }
    function isRegistryBound(address _registry) external view returns (bool) { return _boundRegistries[_registry]; }
}