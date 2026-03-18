// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./interfaces/IKYCVerifier.sol";

interface IRWAProjectNFT {
    struct Project {
        uint256 id;
        address owner;
        string metadataURI;
        uint256 fundingGoal;
        uint256 totalRaised;
        uint256 minInvestment;
        uint256 maxInvestment;
        uint256 deadline;
        uint8 status;
        address securityToken;
        address escrowVault;
        uint256 createdAt;
        uint256 completedAt;
        bool transferable;
    }
    function getProject(uint256 projectId) external view returns (Project memory);
    function projectExists(uint256 projectId) external view returns (bool);
}

interface IRWASecurityToken {
    function mintForOffChainPayment(
        address _to,
        uint256 _tokenAmount,
        string calldata _paymentMethod,
        string calldata _paymentReference
    ) external;
    function isPaymentProcessed(string calldata _reference) external view returns (bool);
}

/**
 * @title OffChainInvestmentManager
 * @notice Manages off-chain investments (Stripe, bank transfer, etc.) with off-chain KYC verification
 * @dev Uses KYCVerifier for signature-based KYC instead of on-chain IdentityRegistry
 */
contract OffChainInvestmentManager is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    // ============ Roles ============
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PROCESSOR_ROLE = keccak256("PROCESSOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ============ Enums ============
    enum PaymentStatus { Pending, Confirmed, Minted, Failed, Refunded }
    enum PaymentMethod { Stripe, BankTransfer, Wire, Check, Crypto, Other }

    // ============ Structs ============
    struct Investment {
        uint256 id;
        uint256 projectId;
        address investor;
        uint256 amountUSD;
        uint256 tokenAmount;
        PaymentMethod paymentMethod;
        string paymentReference;
        PaymentStatus status;
        uint256 createdAt;
        uint256 processedAt;
        address processor;
        string notes;
    }

    /// @notice KYC proof data for signature verification
    struct KYCProof {
        uint8 level;
        uint16 countryCode;
        uint256 expiry;
        bytes signature;
    }

    // ============ State Variables ============
    IRWAProjectNFT public projectNFT;
    IKYCVerifier public kycVerifier;

    uint256 private _investmentCounter;

    mapping(uint256 => Investment) public investments;
    mapping(string => uint256) public paymentReferenceToId;
    mapping(address => uint256[]) public investorInvestments;
    mapping(uint256 => uint256[]) public projectInvestments;
    mapping(uint256 => uint256) public projectOffChainRaised;
    mapping(uint256 => uint256) public projectTokenPrice;

    /// @notice Minimum KYC level per project (projectId => minLevel)
    mapping(uint256 => uint8) public projectMinKYCLevel;

    /// @notice Restricted countries per project (projectId => countryCode => restricted)
    mapping(uint256 => mapping(uint16 => bool)) public projectRestrictedCountries;

    /// @notice Default restricted countries
    uint16[] public defaultRestrictedCountries;

    uint256 public defaultTokenPrice;
    uint8 public defaultMinKYCLevel;

    // ============ Events ============
    event InvestmentCreated(
        uint256 indexed investmentId,
        uint256 indexed projectId,
        address indexed investor,
        uint256 amountUSD,
        PaymentMethod paymentMethod,
        string paymentReference
    );
    event InvestmentConfirmed(uint256 indexed investmentId, address processor);
    event TokensMinted(uint256 indexed investmentId, address indexed investor, uint256 tokenAmount);
    event InvestmentFailed(uint256 indexed investmentId, string reason);
    event InvestmentRefunded(uint256 indexed investmentId);
    event TokenPriceSet(uint256 indexed projectId, uint256 priceInCents);
    event KYCVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event ProjectKYCLevelSet(uint256 indexed projectId, uint8 minLevel);
    event ProjectCountryRestrictionSet(uint256 indexed projectId, uint16 countryCode, bool restricted);
    event DefaultRestrictedCountryUpdated(uint16 countryCode, bool restricted);
    event DefaultMinKYCLevelUpdated(uint8 oldLevel, uint8 newLevel);

    // ============ Errors ============
    error InvalidKYCProof();
    error KYCLevelTooLow(uint8 required, uint8 provided);
    error KYCExpired();
    error CountryRestricted(uint16 countryCode);
    error InvalidKYCLevel();
    error ProjectDoesNotExist();
    error ProjectNotActive();
    error InvalidInvestor();
    error InvalidAmount();
    error PaymentReferenceRequired();
    error PaymentReferenceAlreadyUsed();
    error InvestmentDoesNotExist();
    error InvestmentNotPending();
    error SecurityTokenNotDeployed();
    error CannotRefund();
    error BatchTooLarge();
    error InvalidPrice();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _admin,
        address _projectNFT,
        address _kycVerifier
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(PROCESSOR_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);

        projectNFT = IRWAProjectNFT(_projectNFT);
        kycVerifier = IKYCVerifier(_kycVerifier);
        defaultTokenPrice = 100;
        defaultMinKYCLevel = 1; // BASIC level by default

        // Set default restricted countries (OFAC list)
        defaultRestrictedCountries.push(408); // North Korea
        defaultRestrictedCountries.push(364); // Iran
        defaultRestrictedCountries.push(760); // Syria
        defaultRestrictedCountries.push(192); // Cuba
    }

    // ============ Internal KYC Verification ============

    /**
     * @notice Internal function to verify KYC proof
     */
    function _verifyKYCProof(
        address _user,
        KYCProof calldata _proof,
        uint256 _projectId
    ) internal view {
        // Skip if no KYC verifier set
        if (address(kycVerifier) == address(0)) {
            return;
        }

        // Verify signature
        bool valid = kycVerifier.verify(
            _user,
            _proof.level,
            _proof.countryCode,
            _proof.expiry,
            _proof.signature
        );

        if (!valid) revert InvalidKYCProof();

        // Get minimum level for project
        uint8 minLevel = projectMinKYCLevel[_projectId];
        if (minLevel == 0) {
            minLevel = defaultMinKYCLevel;
        }

        // Check level
        if (_proof.level < minLevel) {
            revert KYCLevelTooLow(minLevel, _proof.level);
        }

        // Check expiry
        if (block.timestamp > _proof.expiry) {
            revert KYCExpired();
        }

        // Check country restrictions
        if (_isCountryRestricted(_proof.countryCode, _projectId)) {
            revert CountryRestricted(_proof.countryCode);
        }
    }

    /**
     * @notice Check if a country is restricted for a project
     */
    function _isCountryRestricted(uint16 _countryCode, uint256 _projectId) internal view returns (bool) {
        // Check project-specific restriction first
        if (_projectId > 0 && projectRestrictedCountries[_projectId][_countryCode]) {
            return true;
        }

        // Check default restricted countries
        uint256 length = defaultRestrictedCountries.length;
        for (uint256 i = 0; i < length; ++i) {
            if (defaultRestrictedCountries[i] == _countryCode) {
                return true;
            }
        }

        return false;
    }

    // ============ Investment Management ============

    /**
     * @notice Create an investment with KYC verification
     * @dev Called by backend when off-chain payment is initiated
     * @param _projectId Project ID
     * @param _investor Investor address
     * @param _amountUSD Amount in USD cents
     * @param _paymentMethod Payment method used
     * @param _paymentReference Unique payment reference
     * @param _kycProof KYC proof for the investor
     */
    function createInvestment(
        uint256 _projectId,
        address _investor,
        uint256 _amountUSD,
        PaymentMethod _paymentMethod,
        string calldata _paymentReference,
        KYCProof calldata _kycProof
    ) external onlyRole(PROCESSOR_ROLE) whenNotPaused returns (uint256 investmentId) {
        if (!projectNFT.projectExists(_projectId)) revert ProjectDoesNotExist();
        if (_investor == address(0)) revert InvalidInvestor();
        if (_amountUSD == 0) revert InvalidAmount();
        if (bytes(_paymentReference).length == 0) revert PaymentReferenceRequired();
        if (paymentReferenceToId[_paymentReference] != 0) revert PaymentReferenceAlreadyUsed();

        IRWAProjectNFT.Project memory project = projectNFT.getProject(_projectId);
        if (project.status != 2) revert ProjectNotActive();

        // Verify KYC
        _verifyKYCProof(_investor, _kycProof, _projectId);

        uint256 tokenPrice = projectTokenPrice[_projectId];
        if (tokenPrice == 0) {
            tokenPrice = defaultTokenPrice;
        }
        uint256 tokenAmount = (_amountUSD * 1e18) / tokenPrice;

        _investmentCounter++;
        investmentId = _investmentCounter;

        investments[investmentId] = Investment({
            id: investmentId,
            projectId: _projectId,
            investor: _investor,
            amountUSD: _amountUSD,
            tokenAmount: tokenAmount,
            paymentMethod: _paymentMethod,
            paymentReference: _paymentReference,
            status: PaymentStatus.Pending,
            createdAt: block.timestamp,
            processedAt: 0,
            processor: address(0),
            notes: ""
        });

        paymentReferenceToId[_paymentReference] = investmentId;
        investorInvestments[_investor].push(investmentId);
        projectInvestments[_projectId].push(investmentId);

        emit InvestmentCreated(
            investmentId,
            _projectId,
            _investor,
            _amountUSD,
            _paymentMethod,
            _paymentReference
        );

        return investmentId;
    }

    /**
     * @notice Create investment without KYC proof (for backward compatibility)
     * @dev Only works if KYC verifier is not set
     */
    function createInvestmentNoKYC(
        uint256 _projectId,
        address _investor,
        uint256 _amountUSD,
        PaymentMethod _paymentMethod,
        string calldata _paymentReference
    ) external onlyRole(PROCESSOR_ROLE) whenNotPaused returns (uint256 investmentId) {
        // Only allow if no KYC verifier is configured
        require(address(kycVerifier) == address(0), "KYC proof required");

        if (!projectNFT.projectExists(_projectId)) revert ProjectDoesNotExist();
        if (_investor == address(0)) revert InvalidInvestor();
        if (_amountUSD == 0) revert InvalidAmount();
        if (bytes(_paymentReference).length == 0) revert PaymentReferenceRequired();
        if (paymentReferenceToId[_paymentReference] != 0) revert PaymentReferenceAlreadyUsed();

        IRWAProjectNFT.Project memory project = projectNFT.getProject(_projectId);
        if (project.status != 2) revert ProjectNotActive();

        uint256 tokenPrice = projectTokenPrice[_projectId];
        if (tokenPrice == 0) {
            tokenPrice = defaultTokenPrice;
        }
        uint256 tokenAmount = (_amountUSD * 1e18) / tokenPrice;

        _investmentCounter++;
        investmentId = _investmentCounter;

        investments[investmentId] = Investment({
            id: investmentId,
            projectId: _projectId,
            investor: _investor,
            amountUSD: _amountUSD,
            tokenAmount: tokenAmount,
            paymentMethod: _paymentMethod,
            paymentReference: _paymentReference,
            status: PaymentStatus.Pending,
            createdAt: block.timestamp,
            processedAt: 0,
            processor: address(0),
            notes: ""
        });

        paymentReferenceToId[_paymentReference] = investmentId;
        investorInvestments[_investor].push(investmentId);
        projectInvestments[_projectId].push(investmentId);

        emit InvestmentCreated(
            investmentId,
            _projectId,
            _investor,
            _amountUSD,
            _paymentMethod,
            _paymentReference
        );

        return investmentId;
    }

    /**
     * @notice Confirm payment and mint tokens
     */
    function confirmAndMint(uint256 _investmentId) external onlyRole(PROCESSOR_ROLE) nonReentrant whenNotPaused {
        Investment storage investment = investments[_investmentId];
        if (investment.id == 0) revert InvestmentDoesNotExist();
        if (investment.status != PaymentStatus.Pending) revert InvestmentNotPending();

        IRWAProjectNFT.Project memory project = projectNFT.getProject(investment.projectId);
        if (project.securityToken == address(0)) revert SecurityTokenNotDeployed();

        investment.status = PaymentStatus.Confirmed;
        investment.processedAt = block.timestamp;
        investment.processor = msg.sender;

        emit InvestmentConfirmed(_investmentId, msg.sender);

        IRWASecurityToken securityToken = IRWASecurityToken(project.securityToken);
        string memory methodStr = _paymentMethodToString(investment.paymentMethod);

        securityToken.mintForOffChainPayment(
            investment.investor,
            investment.tokenAmount,
            methodStr,
            investment.paymentReference
        );

        investment.status = PaymentStatus.Minted;
        projectOffChainRaised[investment.projectId] += investment.amountUSD;

        emit TokensMinted(_investmentId, investment.investor, investment.tokenAmount);
    }

    /**
     * @notice Batch confirm and mint for multiple investments
     */
    function batchConfirmAndMint(
        uint256[] calldata _investmentIds
    ) external onlyRole(PROCESSOR_ROLE) nonReentrant whenNotPaused {
        if (_investmentIds.length > 20) revert BatchTooLarge();

        for (uint256 i = 0; i < _investmentIds.length; i++) {
            Investment storage investment = investments[_investmentIds[i]];

            if (investment.id == 0 || investment.status != PaymentStatus.Pending) {
                continue;
            }

            IRWAProjectNFT.Project memory project = projectNFT.getProject(investment.projectId);
            if (project.securityToken == address(0)) {
                continue;
            }

            investment.status = PaymentStatus.Confirmed;
            investment.processedAt = block.timestamp;
            investment.processor = msg.sender;

            emit InvestmentConfirmed(_investmentIds[i], msg.sender);

            IRWASecurityToken securityToken = IRWASecurityToken(project.securityToken);
            string memory methodStr = _paymentMethodToString(investment.paymentMethod);

            try securityToken.mintForOffChainPayment(
                investment.investor,
                investment.tokenAmount,
                methodStr,
                investment.paymentReference
            ) {
                investment.status = PaymentStatus.Minted;
                projectOffChainRaised[investment.projectId] += investment.amountUSD;
                emit TokensMinted(_investmentIds[i], investment.investor, investment.tokenAmount);
            } catch {
                investment.status = PaymentStatus.Failed;
                investment.notes = "Minting failed";
                emit InvestmentFailed(_investmentIds[i], "Minting failed");
            }
        }
    }

    /**
     * @notice Mark investment as failed
     */
    function markFailed(
        uint256 _investmentId,
        string calldata _reason
    ) external onlyRole(PROCESSOR_ROLE) {
        Investment storage investment = investments[_investmentId];
        if (investment.id == 0) revert InvestmentDoesNotExist();
        if (investment.status != PaymentStatus.Pending) revert InvestmentNotPending();

        investment.status = PaymentStatus.Failed;
        investment.processedAt = block.timestamp;
        investment.processor = msg.sender;
        investment.notes = _reason;

        emit InvestmentFailed(_investmentId, _reason);
    }

    /**
     * @notice Mark investment as refunded
     */
    function markRefunded(uint256 _investmentId) external onlyRole(PROCESSOR_ROLE) {
        Investment storage investment = investments[_investmentId];
        if (investment.id == 0) revert InvestmentDoesNotExist();
        if (investment.status != PaymentStatus.Pending && investment.status != PaymentStatus.Failed) {
            revert CannotRefund();
        }

        investment.status = PaymentStatus.Refunded;
        investment.processedAt = block.timestamp;
        investment.processor = msg.sender;

        emit InvestmentRefunded(_investmentId);
    }

    // ============ KYC Configuration ============

    /**
     * @notice Set minimum KYC level for a project
     */
    function setProjectKYCLevel(
        uint256 _projectId,
        uint8 _minLevel
    ) external onlyRole(OPERATOR_ROLE) {
        if (_minLevel > 4) revert InvalidKYCLevel();
        projectMinKYCLevel[_projectId] = _minLevel;
        emit ProjectKYCLevelSet(_projectId, _minLevel);
    }

    /**
     * @notice Set country restriction for a project
     */
    function setProjectCountryRestriction(
        uint256 _projectId,
        uint16 _countryCode,
        bool _restricted
    ) external onlyRole(OPERATOR_ROLE) {
        projectRestrictedCountries[_projectId][_countryCode] = _restricted;
        emit ProjectCountryRestrictionSet(_projectId, _countryCode, _restricted);
    }

    /**
     * @notice Batch set country restrictions for a project
     */
    function batchSetProjectCountryRestrictions(
        uint256 _projectId,
        uint16[] calldata _countryCodes,
        bool _restricted
    ) external onlyRole(OPERATOR_ROLE) {
        uint256 length = _countryCodes.length;
        for (uint256 i = 0; i < length; ++i) {
            projectRestrictedCountries[_projectId][_countryCodes[i]] = _restricted;
            emit ProjectCountryRestrictionSet(_projectId, _countryCodes[i], _restricted);
        }
    }

    /**
     * @notice Add a default restricted country
     */
    function addDefaultRestrictedCountry(uint16 _countryCode) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = defaultRestrictedCountries.length;
        for (uint256 i = 0; i < length; ++i) {
            if (defaultRestrictedCountries[i] == _countryCode) {
                return;
            }
        }
        defaultRestrictedCountries.push(_countryCode);
        emit DefaultRestrictedCountryUpdated(_countryCode, true);
    }

    /**
     * @notice Remove a default restricted country
     */
    function removeDefaultRestrictedCountry(uint16 _countryCode) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = defaultRestrictedCountries.length;
        for (uint256 i = 0; i < length; ++i) {
            if (defaultRestrictedCountries[i] == _countryCode) {
                defaultRestrictedCountries[i] = defaultRestrictedCountries[length - 1];
                defaultRestrictedCountries.pop();
                emit DefaultRestrictedCountryUpdated(_countryCode, false);
                return;
            }
        }
    }

    /**
     * @notice Set default minimum KYC level
     */
    function setDefaultMinKYCLevel(uint8 _level) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_level > 4) revert InvalidKYCLevel();
        uint8 oldLevel = defaultMinKYCLevel;
        defaultMinKYCLevel = _level;
        emit DefaultMinKYCLevelUpdated(oldLevel, _level);
    }

    // ============ Admin Functions ============

    function setTokenPrice(
        uint256 _projectId,
        uint256 _priceInCents
    ) external onlyRole(OPERATOR_ROLE) {
        if (_priceInCents == 0) revert InvalidPrice();
        projectTokenPrice[_projectId] = _priceInCents;
        emit TokenPriceSet(_projectId, _priceInCents);
    }

    function setDefaultTokenPrice(uint256 _priceInCents) external onlyRole(OPERATOR_ROLE) {
        if (_priceInCents == 0) revert InvalidPrice();
        defaultTokenPrice = _priceInCents;
    }

    function setProjectNFT(address _projectNFT) external onlyRole(DEFAULT_ADMIN_ROLE) {
        projectNFT = IRWAProjectNFT(_projectNFT);
    }

    function setKYCVerifier(address _kycVerifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit KYCVerifierUpdated(address(kycVerifier), _kycVerifier);
        kycVerifier = IKYCVerifier(_kycVerifier);
    }

    // ============ View Functions ============

    function getInvestment(uint256 _investmentId) external view returns (Investment memory) {
        return investments[_investmentId];
    }

    function getInvestorInvestments(address _investor) external view returns (uint256[] memory) {
        return investorInvestments[_investor];
    }

    function getProjectInvestments(uint256 _projectId) external view returns (uint256[] memory) {
        return projectInvestments[_projectId];
    }

    function getProjectOffChainTotal(uint256 _projectId) external view returns (uint256) {
        return projectOffChainRaised[_projectId];
    }

    function calculateTokenAmount(
        uint256 _projectId,
        uint256 _amountUSD
    ) external view returns (uint256) {
        uint256 tokenPrice = projectTokenPrice[_projectId];
        if (tokenPrice == 0) {
            tokenPrice = defaultTokenPrice;
        }
        return (_amountUSD * 1e18) / tokenPrice;
    }

    function getTotalInvestments() external view returns (uint256) {
        return _investmentCounter;
    }

    function getKYCVerifier() external view returns (address) {
        return address(kycVerifier);
    }

    function getDefaultRestrictedCountries() external view returns (uint16[] memory) {
        return defaultRestrictedCountries;
    }

    function isCountryRestricted(
        uint16 _countryCode,
        uint256 _projectId
    ) external view returns (bool) {
        return _isCountryRestricted(_countryCode, _projectId);
    }

    function getProjectMinKYCLevel(uint256 _projectId) external view returns (uint8) {
        uint8 level = projectMinKYCLevel[_projectId];
        return level > 0 ? level : defaultMinKYCLevel;
    }

    // ============ Internal Helpers ============

    function _paymentMethodToString(PaymentMethod _method) internal pure returns (string memory) {
        if (_method == PaymentMethod.Stripe) return "Stripe";
        if (_method == PaymentMethod.BankTransfer) return "BankTransfer";
        if (_method == PaymentMethod.Wire) return "Wire";
        if (_method == PaymentMethod.Check) return "Check";
        if (_method == PaymentMethod.Crypto) return "Crypto";
        return "Other";
    }

    // ============ Pause Functions ============

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}