// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "../interfaces/IIdentityRegistry.sol";
import "../interfaces/IIdentityRegistryStorage.sol";
import "../interfaces/ITrustedIssuersRegistry.sol";
import "../interfaces/IClaimTopicsRegistry.sol";
import "../interfaces/IClaimIssuer.sol";
import "../libraries/Constants.sol";

/**
 * @title IdentityRegistry
 * @dev ERC-3643 compliant Identity Registry for RWA tokens
 */
contract IdentityRegistry is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    IIdentityRegistry
{
    // Roles
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");

    // State variables
    IIdentityRegistryStorage private _identityStorage;
    ITrustedIssuersRegistry private _issuersRegistry;
    IClaimTopicsRegistry private _topicsRegistry;
    
    // Verification status (in addition to identity existence)
    mapping(address => bool) private _verified;

    // Events
    event ClaimTopicsRegistrySet(address indexed claimTopicsRegistry);
    event IdentityStorageSet(address indexed identityStorage);
    event TrustedIssuersRegistrySet(address indexed trustedIssuersRegistry);
    event IdentityRegistered(address indexed investorAddress, address indexed identity);
    event IdentityRemoved(address indexed investorAddress, address indexed identity);
    event IdentityUpdated(address indexed oldIdentity, address indexed newIdentity);
    event CountryUpdated(address indexed investorAddress, uint16 indexed country);
    event VerificationStatusChanged(address indexed investorAddress, bool verified);

    // Errors
    error InvalidAddress();
    error IdentityAlreadyRegistered();
    error IdentityNotRegistered();
    error BatchTooLarge();
    error ArrayLengthMismatch();
    error InvalidCountry();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract
     */
    function initialize(
        address _admin,
        address _storage,
        address _issuers,
        address _topics
    ) external initializer {
        if (_admin == address(0) || _storage == address(0) || 
            _issuers == address(0) || _topics == address(0)) {
            revert InvalidAddress();
        }

        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(REGISTRAR_ROLE, _admin);
        _grantRole(AGENT_ROLE, _admin);

        _identityStorage = IIdentityRegistryStorage(_storage);
        _issuersRegistry = ITrustedIssuersRegistry(_issuers);
        _topicsRegistry = IClaimTopicsRegistry(_topics);

        emit IdentityStorageSet(_storage);
        emit TrustedIssuersRegistrySet(_issuers);
        emit ClaimTopicsRegistrySet(_topics);
    }

    /**
     * @dev Authorize upgrade - only admin
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    /**
     * @dev Register a new identity
     */
    function registerIdentity(
        address _userAddress,
        address _identity,
        uint16 _country
    ) external onlyRole(REGISTRAR_ROLE) whenNotPaused {
        if (_userAddress == address(0) || _identity == address(0)) {
            revert InvalidAddress();
        }
        if (_country == 0) {
            revert InvalidCountry();
        }
        if (_identityStorage.storedIdentity(_userAddress) != address(0)) {
            revert IdentityAlreadyRegistered();
        }

        _identityStorage.addIdentityToStorage(_userAddress, _identity, _country);
        _verified[_userAddress] = true;
        
        emit IdentityRegistered(_userAddress, _identity);
        emit VerificationStatusChanged(_userAddress, true);
    }

    /**
     * @dev Remove an identity
     */
    function deleteIdentity(address _userAddress) external onlyRole(REGISTRAR_ROLE) whenNotPaused {
        if (_userAddress == address(0)) {
            revert InvalidAddress();
        }
        
        address storedId  = _identityStorage.storedIdentity(_userAddress);
        if (storedId  == address(0)) {
            revert IdentityNotRegistered();
        }

        _identityStorage.removeIdentityFromStorage(_userAddress);
        _verified[_userAddress] = false;
        
        emit IdentityRemoved(_userAddress, storedId);
        emit VerificationStatusChanged(_userAddress, false);
    }

    /**
     * @dev Update identity contract for a user
     */
    function updateIdentity(
        address _userAddress,
        address _newIdentity
    ) external onlyRole(REGISTRAR_ROLE) whenNotPaused {
        if (_userAddress == address(0) || _newIdentity == address(0)) {
            revert InvalidAddress();
        }
        
        address oldIdentity = _identityStorage.storedIdentity(_userAddress);
        if (oldIdentity == address(0)) {
            revert IdentityNotRegistered();
        }

        _identityStorage.modifyStoredIdentity(_userAddress, _newIdentity);
        
        emit IdentityUpdated(oldIdentity, _newIdentity);
    }

    /**
     * @dev Update country for a user
     */
    function updateCountry(
        address _userAddress,
        uint16 _country
    ) external onlyRole(REGISTRAR_ROLE) whenNotPaused {
        if (_userAddress == address(0)) {
            revert InvalidAddress();
        }
        if (_country == 0) {
            revert InvalidCountry();
        }
        if (_identityStorage.storedIdentity(_userAddress) == address(0)) {
            revert IdentityNotRegistered();
        }

        _identityStorage.modifyStoredInvestorCountry(_userAddress, _country);
        
        emit CountryUpdated(_userAddress, _country);
    }

    /**
     * @dev Batch register identities
     */
    function batchRegisterIdentity(
        address[] calldata _userAddresses,
        address[] calldata _identities,
        uint16[] calldata _countries
    ) external onlyRole(REGISTRAR_ROLE) whenNotPaused {
        uint256 length = _userAddresses.length;
        
        if (length > Constants.MAX_BATCH_SIZE) {
            revert BatchTooLarge();
        }
        if (length != _identities.length || length != _countries.length) {
            revert ArrayLengthMismatch();
        }

        for (uint256 i = 0; i < length; i++) {
            if (_userAddresses[i] == address(0) || _identities[i] == address(0)) {
                revert InvalidAddress();
            }
            if (_countries[i] == 0) {
                revert InvalidCountry();
            }
            if (_identityStorage.storedIdentity(_userAddresses[i]) != address(0)) {
                revert IdentityAlreadyRegistered();
            }

            _identityStorage.addIdentityToStorage(_userAddresses[i], _identities[i], _countries[i]);
            _verified[_userAddresses[i]] = true;
            
            emit IdentityRegistered(_userAddresses[i], _identities[i]);
            emit VerificationStatusChanged(_userAddresses[i], true);
        }
    }

    /**
     * @dev Set identity storage contract
     */
    function setIdentityRegistryStorage(address _storage) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_storage == address(0)) {
            revert InvalidAddress();
        }
        _identityStorage = IIdentityRegistryStorage(_storage);
        emit IdentityStorageSet(_storage);
    }

    /**
     * @dev Set trusted issuers registry
     */
    function setTrustedIssuersRegistry(address _issuers) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_issuers == address(0)) {
            revert InvalidAddress();
        }
        _issuersRegistry = ITrustedIssuersRegistry(_issuers);
        emit TrustedIssuersRegistrySet(_issuers);
    }

    /**
     * @dev Set claim topics registry
     */
    function setClaimTopicsRegistry(address _topics) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_topics == address(0)) {
            revert InvalidAddress();
        }
        _topicsRegistry = IClaimTopicsRegistry(_topics);
        emit ClaimTopicsRegistrySet(_topics);
    }

    /**
     * @dev Set verification status manually (agent can override)
     */
    function setVerified(address _userAddress, bool _status) external onlyRole(AGENT_ROLE) {
        if (_userAddress == address(0)) {
            revert InvalidAddress();
        }
        if (_identityStorage.storedIdentity(_userAddress) == address(0)) {
            revert IdentityNotRegistered();
        }
        
        _verified[_userAddress] = _status;
        emit VerificationStatusChanged(_userAddress, _status);
    }

    /**
     * @dev Internal function to check identity validity against claim topics and trusted issuers
     */
    function _checkIdentityValidity(address _identity) internal view returns (bool) {
        // Get required claim topics
        uint256[] memory topics = _topicsRegistry.getClaimTopics();
        if (topics.length == 0) {
            // No claim topics required - identity is valid
            return true;
        }

        // Get trusted issuers
        address[] memory trustedIssuers = _issuersRegistry.getTrustedIssuers();
        if (trustedIssuers.length == 0) {
            // No trusted issuers configured - cannot validate claims
            return false;
        }

        // Check each required topic
        for (uint256 i = 0; i < topics.length; i++) {
            bool topicValidated = false;

            // Check each trusted issuer for this topic
            for (uint256 j = 0; j < trustedIssuers.length && !topicValidated; j++) {
                address issuer = trustedIssuers[j];
                
                // Check if this issuer is trusted for this topic
                uint256[] memory issuerTopics = _issuersRegistry.getTrustedIssuerClaimTopics(issuer);
                bool issuerHandlesTopic = false;
                
                for (uint256 k = 0; k < issuerTopics.length; k++) {
                    if (issuerTopics[k] == topics[i]) {
                        issuerHandlesTopic = true;
                        break;
                    }
                }

                if (!issuerHandlesTopic) {
                    continue;
                }

                // Try to get claim IDs for this topic from the issuer
                try IClaimIssuer(issuer).getClaimIdsByTopic(topics[i]) returns (bytes32[] memory claimIds) {
                    for (uint256 m = 0; m < claimIds.length; m++) {
                        // Check if this claim is valid
                        try IClaimIssuer(issuer).isClaimValid(_identity, claimIds[m]) returns (bool valid) {
                            if (valid) {
                                topicValidated = true;
                                break;
                            }
                        } catch {
                            // Claim validation failed, continue checking
                        }
                    }
                } catch {
                    // getClaimIdsByTopic not available or failed, try alternative approach
                    // Some issuers may track claims differently
                }
            }

            // If any required topic is not validated, identity is invalid
            if (!topicValidated) {
                return false;
            }
        }

        return true;
    }

    // ============ View Functions ============

    /**
     * @dev Check if an address is verified
     */
    function isVerified(address _userAddress) external view returns (bool) {
        if (_identityStorage.storedIdentity(_userAddress) == address(0)) {
            return false;
        }
        return _verified[_userAddress];
    }

    /**
     * @dev Get identity contract for a user
     */
    function identity(address _userAddress) external view returns (address) {
        return _identityStorage.storedIdentity(_userAddress);
    }

    /**
     * @dev Get investor country
     */
    function investorCountry(address _userAddress) external view returns (uint16) {
        return _identityStorage.storedInvestorCountry(_userAddress);
    }

    /**
     * @dev Check if identity exists
     */
    function contains(address _userAddress) external view returns (bool) {
        return _identityStorage.storedIdentity(_userAddress) != address(0);
    }

    /**
     * @dev Get identity storage contract
     */
    function identityStorage() external view returns (address) {
        return address(_identityStorage);
    }

    /**
     * @dev Get trusted issuers registry
     */
    function issuersRegistry() external view returns (address) {
        return address(_issuersRegistry);
    }

    /**
     * @dev Get claim topics registry
     */
    function topicsRegistry() external view returns (address) {
        return address(_topicsRegistry);
    }

    // ============ Pause Functions ============

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}