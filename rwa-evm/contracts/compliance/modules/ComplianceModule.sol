// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../../interfaces/IKYCVerifier.sol";

contract ComplianceModule is AccessControl {
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    
    IKYCVerifier public kycVerifier;
    
    mapping(uint16 => bool) public restrictedCountries;
    mapping(uint16 => mapping(uint16 => bool)) public countryRestrictions;
    mapping(uint8 => uint256) public maxHolding;
    uint256 public maxInvestors;
    mapping(address => uint256) public investorCount;
    mapping(address => mapping(address => bool)) public isInvestor;
    uint256 public minInvestment;
    mapping(address => bool) public requiresAccreditation;
    uint8 public minKYCLevel;

    event CountryRestricted(uint16 indexed country, bool restricted);
    event MaxHoldingSet(uint8 indexed category, uint256 amount);
    event MaxInvestorsSet(uint256 maxInvestors);
    event KYCVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event MinKYCLevelUpdated(uint8 oldLevel, uint8 newLevel);

    error InvalidAddress();
    error KYCNotVerified();
    error CountryIsRestricted();
    error BelowMinInvestment();
    error ExceedsMaxHolding();

    constructor(address _kycVerifier) {
        if (_kycVerifier == address(0)) revert InvalidAddress();
        kycVerifier = IKYCVerifier(_kycVerifier);
        minKYCLevel = 1; // Default to LEVEL_BASIC
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, msg.sender);
    }

    /**
     * @notice Check if transfer is compliant with KYC proof
     * @param _to Recipient address
     * @param _amount Transfer amount
     * @param _level KYC level from proof
     * @param _countryCode Country code from proof
     * @param _expiry Expiry timestamp from proof
     * @param _signature Signature from trusted signer
     */
    function canTransferWithProof(
        address _to,
        uint256 _amount,
        uint8 _level,
        uint16 _countryCode,
        uint256 _expiry,
        bytes calldata _signature
    ) external view returns (bool) {
        // Verify KYC signature
        if (!kycVerifier.verify(_to, _level, _countryCode, _expiry, _signature)) {
            return false;
        }
        
        // Check minimum KYC level
        if (_level < minKYCLevel) {
            return false;
        }
        
        // Check country restrictions
        if (restrictedCountries[_countryCode]) {
            return false;
        }
        
        // Check max holding by KYC level
        if (maxHolding[_level] > 0 && _amount > maxHolding[_level]) {
            return false;
        }
        
        // Check minimum investment
        if (_amount < minInvestment) {
            return false;
        }
        
        return true;
    }

    /**
     * @notice Check country-to-country transfer with KYC proofs
     */
    function canTransferBetweenWithProof(
        address _from,
        address _to,
        uint256 _amount,
        uint8 _fromLevel,
        uint16 _fromCountry,
        uint256 _fromExpiry,
        bytes calldata _fromSignature,
        uint8 _toLevel,
        uint16 _toCountry,
        uint256 _toExpiry,
        bytes calldata _toSignature
    ) external view returns (bool) {
        // Verify sender KYC (if not minting)
        if (_from != address(0)) {
            if (!kycVerifier.verify(_from, _fromLevel, _fromCountry, _fromExpiry, _fromSignature)) {
                return false;
            }
            
            // Check country-to-country restrictions
            if (countryRestrictions[_fromCountry][_toCountry]) {
                return false;
            }
        }
        
        // Verify recipient KYC
        if (!kycVerifier.verify(_to, _toLevel, _toCountry, _toExpiry, _toSignature)) {
            return false;
        }
        
        // Check minimum KYC level for recipient
        if (_toLevel < minKYCLevel) {
            return false;
        }
        
        // Check country restrictions for recipient
        if (restrictedCountries[_toCountry]) {
            return false;
        }
        
        // Check max holding
        if (maxHolding[_toLevel] > 0 && _amount > maxHolding[_toLevel]) {
            return false;
        }
        
        // Check minimum investment
        if (_amount < minInvestment) {
            return false;
        }
        
        return true;
    }

    function transferred(address _from, address _to, uint256) external {
        address token = msg.sender;
        if (!isInvestor[token][_to]) {
            isInvestor[token][_to] = true;
            investorCount[token]++;
        }
    }

    // ============================================================================
    // ADMIN FUNCTIONS
    // ============================================================================

    function setKYCVerifier(address _kycVerifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_kycVerifier == address(0)) revert InvalidAddress();
        address oldVerifier = address(kycVerifier);
        kycVerifier = IKYCVerifier(_kycVerifier);
        emit KYCVerifierUpdated(oldVerifier, _kycVerifier);
    }

    function setMinKYCLevel(uint8 _level) external onlyRole(COMPLIANCE_ROLE) {
        uint8 oldLevel = minKYCLevel;
        minKYCLevel = _level;
        emit MinKYCLevelUpdated(oldLevel, _level);
    }

    function setCountryRestriction(uint16 _country, bool _restricted) external onlyRole(COMPLIANCE_ROLE) {
        restrictedCountries[_country] = _restricted;
        emit CountryRestricted(_country, _restricted);
    }

    function setCountryToCountryRestriction(uint16 _fromCountry, uint16 _toCountry, bool _restricted) external onlyRole(COMPLIANCE_ROLE) {
        countryRestrictions[_fromCountry][_toCountry] = _restricted;
    }

    function setMaxHolding(uint8 _level, uint256 _amount) external onlyRole(COMPLIANCE_ROLE) {
        maxHolding[_level] = _amount;
        emit MaxHoldingSet(_level, _amount);
    }

    function setMaxInvestors(uint256 _maxInvestors) external onlyRole(COMPLIANCE_ROLE) {
        maxInvestors = _maxInvestors;
        emit MaxInvestorsSet(_maxInvestors);
    }

    function setMinInvestment(uint256 _minInvestment) external onlyRole(COMPLIANCE_ROLE) {
        minInvestment = _minInvestment;
    }

    function batchRestrictCountries(uint16[] calldata _countries, bool _restricted) external onlyRole(COMPLIANCE_ROLE) {
        for (uint256 i = 0; i < _countries.length; i++) {
            restrictedCountries[_countries[i]] = _restricted;
        }
    }
}