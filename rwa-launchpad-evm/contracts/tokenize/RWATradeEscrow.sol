// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IKYCVerifier.sol";

/**
 * @title RWATradeEscrow
 * @notice Escrow contract for P2P trading of security tokens with stablecoin settlement
 * @dev Uses off-chain KYC verification via KYCVerifier for compliance
 */
contract RWATradeEscrow is 
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct Trade {
        uint256 tradeId;
        address seller;
        address buyer;
        uint256 tokenAmount;
        uint256 stableAmount;
        uint256 pricePerToken;
        uint256 createdAt;
        uint256 expiresAt;
        TradeStatus status;
        bool sellerDeposited;
        bool buyerDeposited;
        uint8 minKYCLevel;          // Minimum KYC level required for this trade
        uint16 sellerCountryCode;   // Seller's country (for compliance tracking)
    }

    struct KYCProof {
        uint8 level;
        uint16 countryCode;
        uint256 expiry;
        bytes signature;
    }
    
    struct CachedKYC {
        uint8 level;
        uint16 countryCode;
        uint256 expiry;
        uint256 cachedAt;
    }

    enum TradeStatus {
        CREATED,
        SELLER_DEPOSITED,
        BUYER_DEPOSITED,
        COMPLETED,
        CANCELLED,
        EXPIRED,
        DISPUTED
    }

    // ============ State Variables ============

    IERC20 public securityToken;
    IERC20 public stablecoin;
    IKYCVerifier public kycVerifier;
    address public platformFeeRecipient;
    
    uint256 public platformFeeBps;          // Default 100 = 1%
    uint256 public tradeCounter;
    uint256 public defaultExpirationTime;   // Default 24 hours
    
    mapping(uint256 => Trade) public trades;
    mapping(address => uint256[]) public sellerTrades;
    mapping(address => uint256[]) public buyerTrades;
    
    // KYC caching
    mapping(address => CachedKYC) private _cachedKYC;
    uint256 public kycCacheValidityDuration;
    
    // KYC settings
    uint8 public defaultMinKYCLevel;
    mapping(uint16 => bool) private _restrictedCountries;
    bool public kycEnforced;
    
    // For dispute resolution
    mapping(address => bool) public arbitrators;
    
    uint256 public totalVolume;
    uint256 public totalFees;

    // ============ Events ============

    event TradeCreated(
        uint256 indexed tradeId,
        address indexed seller,
        uint256 tokenAmount,
        uint256 pricePerToken,
        uint256 totalStable,
        uint8 minKYCLevel
    );
    
    event BuyerAssigned(
        uint256 indexed tradeId,
        address indexed buyer
    );
    
    event SellerDeposited(
        uint256 indexed tradeId,
        address indexed seller,
        uint256 tokenAmount
    );
    
    event BuyerDeposited(
        uint256 indexed tradeId,
        address indexed buyer,
        uint256 stableAmount
    );
    
    event TradeCompleted(
        uint256 indexed tradeId,
        address indexed seller,
        address indexed buyer,
        uint256 tokenAmount,
        uint256 stableAmount,
        uint256 platformFee
    );
    
    event TradeCancelled(
        uint256 indexed tradeId,
        address indexed cancelledBy
    );
    
    event TradeExpired(
        uint256 indexed tradeId
    );
    
    event DisputeRaised(
        uint256 indexed tradeId,
        address indexed raisedBy,
        string reason
    );
    
    event DisputeResolved(
        uint256 indexed tradeId,
        address indexed resolver,
        bool sellerWins
    );
    
    event ArbitratorUpdated(address indexed arbitrator, bool approved);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event KYCVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event KYCCached(address indexed wallet, uint8 level, uint16 countryCode, uint256 expiry);
    event MinKYCLevelUpdated(uint8 oldLevel, uint8 newLevel);
    event CountryRestrictionUpdated(uint16 indexed countryCode, bool restricted);
    event KYCEnforcementUpdated(bool enforced);
    event KYCCacheValidityUpdated(uint256 oldDuration, uint256 newDuration);

    // ============ Errors ============

    error InvalidAddress();
    error InvalidAmount();
    error TradeNotFound();
    error InvalidTradeStatus();
    error NotSeller();
    error NotBuyer();
    error NotParticipant();
    error AlreadyDeposited();
    error TradeIsExpired();
    error NotArbitrator();
    error InsufficientBalance();
    error TransferFailed();
    error InvalidKYCProof();
    error KYCExpired();
    error KYCLevelTooLow();
    error CountryRestricted();
    error KYCNotVerified();
    error InvalidKYCLevel();

    // ============ Modifiers ============

    modifier onlySeller(uint256 _tradeId) {
        if (trades[_tradeId].seller != msg.sender) revert NotSeller();
        _;
    }

    modifier onlyBuyer(uint256 _tradeId) {
        if (trades[_tradeId].buyer != msg.sender) revert NotBuyer();
        _;
    }

    modifier onlyParticipant(uint256 _tradeId) {
        Trade storage trade = trades[_tradeId];
        if (trade.seller != msg.sender && trade.buyer != msg.sender) {
            revert NotParticipant();
        }
        _;
    }

    modifier onlyArbitrator() {
        if (!arbitrators[msg.sender] && msg.sender != owner()) {
            revert NotArbitrator();
        }
        _;
    }

    modifier tradeExists(uint256 _tradeId) {
        if (trades[_tradeId].seller == address(0)) revert TradeNotFound();
        _;
    }

    modifier notExpired(uint256 _tradeId) {
        if (block.timestamp > trades[_tradeId].expiresAt) revert TradeIsExpired();
        _;
    }

    // ============ Initialization ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the escrow contract
     * @param _owner Contract owner
     * @param _securityToken Security token address
     * @param _stablecoin Stablecoin address for payments
     * @param _kycVerifier KYC verifier contract address
     * @param _feeRecipient Platform fee recipient
     * @param _feeBps Platform fee in basis points
     */
    function initialize(
        address _owner,
        address _securityToken,
        address _stablecoin,
        address _kycVerifier,
        address _feeRecipient,
        uint256 _feeBps
    ) external initializer {
        if (_securityToken == address(0) || _stablecoin == address(0) || 
            _kycVerifier == address(0) || _feeRecipient == address(0)) {
            revert InvalidAddress();
        }

        __Ownable_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        _transferOwnership(_owner);

        securityToken = IERC20(_securityToken);
        stablecoin = IERC20(_stablecoin);
        kycVerifier = IKYCVerifier(_kycVerifier);
        platformFeeRecipient = _feeRecipient;
        platformFeeBps = _feeBps;
        defaultExpirationTime = 24 hours;
        defaultMinKYCLevel = 1; // Basic KYC required by default
        kycCacheValidityDuration = 1 hours;
        kycEnforced = true;
        
        // Add default restricted countries (OFAC)
        _restrictedCountries[408] = true; // North Korea
        _restrictedCountries[364] = true; // Iran
        _restrictedCountries[760] = true; // Syria
        _restrictedCountries[192] = true; // Cuba
        
        emit KYCVerifierUpdated(address(0), _kycVerifier);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ============ KYC Functions ============
    
    /**
     * @notice Cache KYC proof for a wallet
     * @param _wallet Wallet address
     * @param _proof KYC proof from backend
     */
    function cacheKYC(
        address _wallet,
        KYCProof calldata _proof
    ) external whenNotPaused {
        _verifyCacheKYC(_wallet, _proof);
        
        _cachedKYC[_wallet] = CachedKYC({
            level: _proof.level,
            countryCode: _proof.countryCode,
            expiry: _proof.expiry,
            cachedAt: block.timestamp
        });
        
        emit KYCCached(_wallet, _proof.level, _proof.countryCode, _proof.expiry);
    }
    
    /**
     * @notice Internal KYC verification for caching
     */
    function _verifyCacheKYC(
        address _wallet,
        KYCProof calldata _proof
    ) internal view {
        bool isValid = kycVerifier.verify(
            _wallet,
            _proof.level,
            _proof.countryCode,
            _proof.expiry,
            _proof.signature
        );
        
        if (!isValid) revert InvalidKYCProof();
        if (_proof.expiry < block.timestamp) revert KYCExpired();
    }
    
    /**
     * @notice Check if a wallet has valid cached KYC
     * @param _wallet Wallet to check
     * @param _minLevel Minimum required level
     * @return bool True if KYC is valid
     */
    function _hasValidKYC(address _wallet, uint8 _minLevel) internal view returns (bool) {
        if (!kycEnforced) return true;
        
        CachedKYC storage cached = _cachedKYC[_wallet];
        
        if (cached.cachedAt == 0) return false;
        if (block.timestamp > cached.cachedAt + kycCacheValidityDuration) return false;
        if (block.timestamp > cached.expiry) return false;
        if (cached.level < _minLevel) return false;
        if (_restrictedCountries[cached.countryCode]) return false;
        
        return true;
    }
    
    /**
     * @notice Verify KYC inline with proof
     */
    function _verifyKYCWithProof(
        address _wallet,
        KYCProof calldata _proof,
        uint8 _minLevel
    ) internal view {
        if (!kycEnforced) return;
        
        bool isValid = kycVerifier.verify(
            _wallet,
            _proof.level,
            _proof.countryCode,
            _proof.expiry,
            _proof.signature
        );
        
        if (!isValid) revert InvalidKYCProof();
        if (_proof.expiry < block.timestamp) revert KYCExpired();
        if (_proof.level < _minLevel) revert KYCLevelTooLow();
        if (_restrictedCountries[_proof.countryCode]) revert CountryRestricted();
    }
    
    /**
     * @notice Cache KYC from proof (internal helper)
     */
    function _cacheKYCFromProof(address _wallet, KYCProof calldata _proof) internal {
        _cachedKYC[_wallet] = CachedKYC({
            level: _proof.level,
            countryCode: _proof.countryCode,
            expiry: _proof.expiry,
            cachedAt: block.timestamp
        });
        
        emit KYCCached(_wallet, _proof.level, _proof.countryCode, _proof.expiry);
    }

    // ============ Trade Creation ============

    /**
     * @notice Create a new trade offer with KYC proof
     * @param _tokenAmount Amount of security tokens to sell
     * @param _pricePerToken Price per token in stablecoin (6 decimals for USDC)
     * @param _expirationTime Custom expiration (0 for default)
     * @param _minKYCLevel Minimum KYC level for buyer (0 for default)
     * @param _proof Seller's KYC proof
     * @return tradeId The created trade ID
     */
    function createTradeWithKYC(
        uint256 _tokenAmount,
        uint256 _pricePerToken,
        uint256 _expirationTime,
        uint8 _minKYCLevel,
        KYCProof calldata _proof
    ) external whenNotPaused returns (uint256 tradeId) {
        if (_tokenAmount == 0 || _pricePerToken == 0) revert InvalidAmount();
        
        _verifyKYCWithProof(msg.sender, _proof, defaultMinKYCLevel);
        _cacheKYCFromProof(msg.sender, _proof);

        tradeId = tradeCounter++;
        
        uint256 stableAmount = (_tokenAmount * _pricePerToken) / 1e18;
        uint256 expiration = _expirationTime > 0 ? _expirationTime : block.timestamp + defaultExpirationTime;
        uint8 buyerMinLevel = _minKYCLevel > 0 ? _minKYCLevel : defaultMinKYCLevel;

        trades[tradeId] = Trade({
            tradeId: tradeId,
            seller: msg.sender,
            buyer: address(0),
            tokenAmount: _tokenAmount,
            stableAmount: stableAmount,
            pricePerToken: _pricePerToken,
            createdAt: block.timestamp,
            expiresAt: expiration,
            status: TradeStatus.CREATED,
            sellerDeposited: false,
            buyerDeposited: false,
            minKYCLevel: buyerMinLevel,
            sellerCountryCode: _proof.countryCode
        });

        sellerTrades[msg.sender].push(tradeId);

        emit TradeCreated(tradeId, msg.sender, _tokenAmount, _pricePerToken, stableAmount, buyerMinLevel);
    }

    /**
     * @notice Create a new trade offer using cached KYC
     * @param _tokenAmount Amount of security tokens to sell
     * @param _pricePerToken Price per token in stablecoin
     * @param _expirationTime Custom expiration (0 for default)
     * @param _minKYCLevel Minimum KYC level for buyer (0 for default)
     * @return tradeId The created trade ID
     */
    function createTrade(
        uint256 _tokenAmount,
        uint256 _pricePerToken,
        uint256 _expirationTime,
        uint8 _minKYCLevel
    ) external whenNotPaused returns (uint256 tradeId) {
        if (_tokenAmount == 0 || _pricePerToken == 0) revert InvalidAmount();
        if (!_hasValidKYC(msg.sender, defaultMinKYCLevel)) revert KYCNotVerified();

        tradeId = tradeCounter++;
        
        uint256 stableAmount = (_tokenAmount * _pricePerToken) / 1e18;
        uint256 expiration = _expirationTime > 0 ? _expirationTime : block.timestamp + defaultExpirationTime;
        uint8 buyerMinLevel = _minKYCLevel > 0 ? _minKYCLevel : defaultMinKYCLevel;

        CachedKYC storage sellerKYC = _cachedKYC[msg.sender];

        trades[tradeId] = Trade({
            tradeId: tradeId,
            seller: msg.sender,
            buyer: address(0),
            tokenAmount: _tokenAmount,
            stableAmount: stableAmount,
            pricePerToken: _pricePerToken,
            createdAt: block.timestamp,
            expiresAt: expiration,
            status: TradeStatus.CREATED,
            sellerDeposited: false,
            buyerDeposited: false,
            minKYCLevel: buyerMinLevel,
            sellerCountryCode: sellerKYC.countryCode
        });

        sellerTrades[msg.sender].push(tradeId);

        emit TradeCreated(tradeId, msg.sender, _tokenAmount, _pricePerToken, stableAmount, buyerMinLevel);
    }

    /**
     * @notice Create trade with immediate deposit and KYC proof
     * @param _tokenAmount Amount of security tokens to sell
     * @param _pricePerToken Price per token in stablecoin
     * @param _expirationTime Custom expiration (0 for default)
     * @param _minKYCLevel Minimum KYC level for buyer
     * @param _proof Seller's KYC proof
     * @return tradeId The created trade ID
     */
    function createTradeAndDepositWithKYC(
        uint256 _tokenAmount,
        uint256 _pricePerToken,
        uint256 _expirationTime,
        uint8 _minKYCLevel,
        KYCProof calldata _proof
    ) external whenNotPaused nonReentrant returns (uint256 tradeId) {
        if (_tokenAmount == 0 || _pricePerToken == 0) revert InvalidAmount();
        if (securityToken.balanceOf(msg.sender) < _tokenAmount) revert InsufficientBalance();
        
        _verifyKYCWithProof(msg.sender, _proof, defaultMinKYCLevel);
        _cacheKYCFromProof(msg.sender, _proof);

        tradeId = tradeCounter++;
        
        uint256 stableAmount = (_tokenAmount * _pricePerToken) / 1e18;
        uint256 expiration = _expirationTime > 0 ? _expirationTime : block.timestamp + defaultExpirationTime;
        uint8 buyerMinLevel = _minKYCLevel > 0 ? _minKYCLevel : defaultMinKYCLevel;

        trades[tradeId] = Trade({
            tradeId: tradeId,
            seller: msg.sender,
            buyer: address(0),
            tokenAmount: _tokenAmount,
            stableAmount: stableAmount,
            pricePerToken: _pricePerToken,
            createdAt: block.timestamp,
            expiresAt: expiration,
            status: TradeStatus.SELLER_DEPOSITED,
            sellerDeposited: true,
            buyerDeposited: false,
            minKYCLevel: buyerMinLevel,
            sellerCountryCode: _proof.countryCode
        });

        sellerTrades[msg.sender].push(tradeId);

        securityToken.safeTransferFrom(msg.sender, address(this), _tokenAmount);

        emit TradeCreated(tradeId, msg.sender, _tokenAmount, _pricePerToken, stableAmount, buyerMinLevel);
        emit SellerDeposited(tradeId, msg.sender, _tokenAmount);
    }

    /**
     * @notice Create trade with immediate deposit using cached KYC
     */
    function createTradeAndDeposit(
        uint256 _tokenAmount,
        uint256 _pricePerToken,
        uint256 _expirationTime,
        uint8 _minKYCLevel
    ) external whenNotPaused nonReentrant returns (uint256 tradeId) {
        if (_tokenAmount == 0 || _pricePerToken == 0) revert InvalidAmount();
        if (securityToken.balanceOf(msg.sender) < _tokenAmount) revert InsufficientBalance();
        if (!_hasValidKYC(msg.sender, defaultMinKYCLevel)) revert KYCNotVerified();

        tradeId = tradeCounter++;
        
        uint256 stableAmount = (_tokenAmount * _pricePerToken) / 1e18;
        uint256 expiration = _expirationTime > 0 ? _expirationTime : block.timestamp + defaultExpirationTime;
        uint8 buyerMinLevel = _minKYCLevel > 0 ? _minKYCLevel : defaultMinKYCLevel;
        
        CachedKYC storage sellerKYC = _cachedKYC[msg.sender];

        trades[tradeId] = Trade({
            tradeId: tradeId,
            seller: msg.sender,
            buyer: address(0),
            tokenAmount: _tokenAmount,
            stableAmount: stableAmount,
            pricePerToken: _pricePerToken,
            createdAt: block.timestamp,
            expiresAt: expiration,
            status: TradeStatus.SELLER_DEPOSITED,
            sellerDeposited: true,
            buyerDeposited: false,
            minKYCLevel: buyerMinLevel,
            sellerCountryCode: sellerKYC.countryCode
        });

        sellerTrades[msg.sender].push(tradeId);

        securityToken.safeTransferFrom(msg.sender, address(this), _tokenAmount);

        emit TradeCreated(tradeId, msg.sender, _tokenAmount, _pricePerToken, stableAmount, buyerMinLevel);
        emit SellerDeposited(tradeId, msg.sender, _tokenAmount);
    }

    // ============ Trade Participation ============

    /**
     * @notice Buyer accepts a trade with KYC proof
     * @param _tradeId Trade ID to accept
     * @param _proof Buyer's KYC proof
     */
    function acceptTradeWithKYC(
        uint256 _tradeId,
        KYCProof calldata _proof
    ) external tradeExists(_tradeId) notExpired(_tradeId) whenNotPaused {
        Trade storage trade = trades[_tradeId];
        
        if (trade.status != TradeStatus.CREATED && trade.status != TradeStatus.SELLER_DEPOSITED) {
            revert InvalidTradeStatus();
        }
        if (trade.buyer != address(0)) revert InvalidTradeStatus();
        if (trade.seller == msg.sender) revert NotBuyer();
        
        _verifyKYCWithProof(msg.sender, _proof, trade.minKYCLevel);
        _cacheKYCFromProof(msg.sender, _proof);

        trade.buyer = msg.sender;
        buyerTrades[msg.sender].push(_tradeId);

        emit BuyerAssigned(_tradeId, msg.sender);
    }

    /**
     * @notice Buyer accepts a trade using cached KYC
     * @param _tradeId Trade ID to accept
     */
    function acceptTrade(uint256 _tradeId) 
        external 
        tradeExists(_tradeId) 
        notExpired(_tradeId) 
        whenNotPaused 
    {
        Trade storage trade = trades[_tradeId];
        
        if (trade.status != TradeStatus.CREATED && trade.status != TradeStatus.SELLER_DEPOSITED) {
            revert InvalidTradeStatus();
        }
        if (trade.buyer != address(0)) revert InvalidTradeStatus();
        if (trade.seller == msg.sender) revert NotBuyer();
        if (!_hasValidKYC(msg.sender, trade.minKYCLevel)) revert KYCNotVerified();

        trade.buyer = msg.sender;
        buyerTrades[msg.sender].push(_tradeId);

        emit BuyerAssigned(_tradeId, msg.sender);
    }

    /**
     * @notice Seller deposits tokens
     * @param _tradeId Trade ID
     */
    function sellerDeposit(uint256 _tradeId) 
        external 
        nonReentrant 
        tradeExists(_tradeId) 
        notExpired(_tradeId)
        onlySeller(_tradeId)
        whenNotPaused 
    {
        Trade storage trade = trades[_tradeId];
        
        if (trade.sellerDeposited) revert AlreadyDeposited();
        if (securityToken.balanceOf(msg.sender) < trade.tokenAmount) revert InsufficientBalance();
        // Seller KYC was verified at trade creation

        trade.sellerDeposited = true;
        
        if (trade.status == TradeStatus.CREATED) {
            trade.status = TradeStatus.SELLER_DEPOSITED;
        }

        securityToken.safeTransferFrom(msg.sender, address(this), trade.tokenAmount);

        emit SellerDeposited(_tradeId, msg.sender, trade.tokenAmount);

        _tryCompleteTrade(_tradeId);
    }

    /**
     * @notice Buyer deposits stablecoin
     * @param _tradeId Trade ID
     */
    function buyerDeposit(uint256 _tradeId) 
        external 
        nonReentrant 
        tradeExists(_tradeId) 
        notExpired(_tradeId)
        onlyBuyer(_tradeId)
        whenNotPaused 
    {
        Trade storage trade = trades[_tradeId];
        
        if (trade.buyerDeposited) revert AlreadyDeposited();
        if (stablecoin.balanceOf(msg.sender) < trade.stableAmount) revert InsufficientBalance();
        // Buyer KYC was verified at trade acceptance

        trade.buyerDeposited = true;
        trade.status = TradeStatus.BUYER_DEPOSITED;

        stablecoin.safeTransferFrom(msg.sender, address(this), trade.stableAmount);

        emit BuyerDeposited(_tradeId, msg.sender, trade.stableAmount);

        _tryCompleteTrade(_tradeId);
    }

    /**
     * @notice Accept trade and deposit in one transaction with KYC proof
     * @param _tradeId Trade ID
     * @param _proof Buyer's KYC proof
     */
    function acceptAndDepositWithKYC(
        uint256 _tradeId,
        KYCProof calldata _proof
    ) external nonReentrant tradeExists(_tradeId) notExpired(_tradeId) whenNotPaused {
        Trade storage trade = trades[_tradeId];
        
        if (trade.status != TradeStatus.CREATED && trade.status != TradeStatus.SELLER_DEPOSITED) {
            revert InvalidTradeStatus();
        }
        if (trade.buyer != address(0)) revert InvalidTradeStatus();
        if (trade.seller == msg.sender) revert NotBuyer();
        if (stablecoin.balanceOf(msg.sender) < trade.stableAmount) revert InsufficientBalance();
        
        _verifyKYCWithProof(msg.sender, _proof, trade.minKYCLevel);
        _cacheKYCFromProof(msg.sender, _proof);

        trade.buyer = msg.sender;
        trade.buyerDeposited = true;
        trade.status = TradeStatus.BUYER_DEPOSITED;
        
        buyerTrades[msg.sender].push(_tradeId);

        stablecoin.safeTransferFrom(msg.sender, address(this), trade.stableAmount);

        emit BuyerAssigned(_tradeId, msg.sender);
        emit BuyerDeposited(_tradeId, msg.sender, trade.stableAmount);

        _tryCompleteTrade(_tradeId);
    }

    /**
     * @notice Accept trade and deposit in one transaction using cached KYC
     * @param _tradeId Trade ID
     */
    function acceptAndDeposit(uint256 _tradeId) 
        external 
        nonReentrant 
        tradeExists(_tradeId) 
        notExpired(_tradeId)
        whenNotPaused 
    {
        Trade storage trade = trades[_tradeId];
        
        if (trade.status != TradeStatus.CREATED && trade.status != TradeStatus.SELLER_DEPOSITED) {
            revert InvalidTradeStatus();
        }
        if (trade.buyer != address(0)) revert InvalidTradeStatus();
        if (trade.seller == msg.sender) revert NotBuyer();
        if (stablecoin.balanceOf(msg.sender) < trade.stableAmount) revert InsufficientBalance();
        if (!_hasValidKYC(msg.sender, trade.minKYCLevel)) revert KYCNotVerified();

        trade.buyer = msg.sender;
        trade.buyerDeposited = true;
        trade.status = TradeStatus.BUYER_DEPOSITED;
        
        buyerTrades[msg.sender].push(_tradeId);

        stablecoin.safeTransferFrom(msg.sender, address(this), trade.stableAmount);

        emit BuyerAssigned(_tradeId, msg.sender);
        emit BuyerDeposited(_tradeId, msg.sender, trade.stableAmount);

        _tryCompleteTrade(_tradeId);
    }

    // ============ Trade Completion ============

    /**
     * @notice Internal function to complete trade if both parties deposited
     */
    function _tryCompleteTrade(uint256 _tradeId) internal {
        Trade storage trade = trades[_tradeId];

        if (!trade.sellerDeposited || !trade.buyerDeposited) return;
        if (trade.status == TradeStatus.COMPLETED) return;

        // Calculate platform fee
        uint256 platformFee = (trade.stableAmount * platformFeeBps) / 10000;
        uint256 sellerReceives = trade.stableAmount - platformFee;

        // Update status
        trade.status = TradeStatus.COMPLETED;

        // Transfer tokens to buyer
        securityToken.safeTransfer(trade.buyer, trade.tokenAmount);

        // Transfer stablecoin to seller (minus fee)
        stablecoin.safeTransfer(trade.seller, sellerReceives);

        // Transfer fee to platform
        if (platformFee > 0) {
            stablecoin.safeTransfer(platformFeeRecipient, platformFee);
        }

        // Update stats
        totalVolume += trade.stableAmount;
        totalFees += platformFee;

        emit TradeCompleted(
            _tradeId,
            trade.seller,
            trade.buyer,
            trade.tokenAmount,
            trade.stableAmount,
            platformFee
        );
    }

    // ============ Trade Cancellation ============

    /**
     * @notice Cancel a trade (only if not completed)
     * @param _tradeId Trade ID
     */
    function cancelTrade(uint256 _tradeId) 
        external 
        nonReentrant 
        tradeExists(_tradeId) 
        onlyParticipant(_tradeId)
    {
        Trade storage trade = trades[_tradeId];
        
        if (trade.status == TradeStatus.COMPLETED || trade.status == TradeStatus.CANCELLED) {
            revert InvalidTradeStatus();
        }

        // Refund deposited amounts
        if (trade.sellerDeposited) {
            securityToken.safeTransfer(trade.seller, trade.tokenAmount);
        }
        
        if (trade.buyerDeposited) {
            stablecoin.safeTransfer(trade.buyer, trade.stableAmount);
        }

        trade.status = TradeStatus.CANCELLED;

        emit TradeCancelled(_tradeId, msg.sender);
    }

    /**
     * @notice Expire and refund a trade that passed deadline
     * @param _tradeId Trade ID
     */
    function expireTrade(uint256 _tradeId) external nonReentrant tradeExists(_tradeId) {
        Trade storage trade = trades[_tradeId];
        
        if (block.timestamp <= trade.expiresAt) revert InvalidTradeStatus();
        if (trade.status == TradeStatus.COMPLETED || 
            trade.status == TradeStatus.CANCELLED || 
            trade.status == TradeStatus.EXPIRED) {
            revert InvalidTradeStatus();
        }

        // Refund deposited amounts
        if (trade.sellerDeposited) {
            securityToken.safeTransfer(trade.seller, trade.tokenAmount);
        }
        
        if (trade.buyerDeposited) {
            stablecoin.safeTransfer(trade.buyer, trade.stableAmount);
        }

        trade.status = TradeStatus.EXPIRED;

        emit TradeExpired(_tradeId);
    }

    // ============ Dispute Resolution ============

    /**
     * @notice Raise a dispute on a trade
     * @param _tradeId Trade ID
     * @param _reason Reason for dispute
     */
    function raiseDispute(uint256 _tradeId, string calldata _reason) 
        external 
        tradeExists(_tradeId) 
        onlyParticipant(_tradeId) 
    {
        Trade storage trade = trades[_tradeId];
        
        if (trade.status == TradeStatus.COMPLETED || trade.status == TradeStatus.CANCELLED) {
            revert InvalidTradeStatus();
        }

        trade.status = TradeStatus.DISPUTED;

        emit DisputeRaised(_tradeId, msg.sender, _reason);
    }

    /**
     * @notice Resolve a dispute (arbitrator only)
     * @param _tradeId Trade ID
     * @param _sellerWins If true, seller gets tokens back; if false, buyer wins
     */
    function resolveDispute(uint256 _tradeId, bool _sellerWins) 
        external 
        nonReentrant 
        tradeExists(_tradeId) 
        onlyArbitrator 
    {
        Trade storage trade = trades[_tradeId];
        
        if (trade.status != TradeStatus.DISPUTED) revert InvalidTradeStatus();

        if (_sellerWins) {
            // Return tokens to seller, stables to buyer
            if (trade.sellerDeposited) {
                securityToken.safeTransfer(trade.seller, trade.tokenAmount);
            }
            if (trade.buyerDeposited) {
                stablecoin.safeTransfer(trade.buyer, trade.stableAmount);
            }
        } else {
            // Complete trade in buyer's favor
            if (trade.sellerDeposited && trade.buyer != address(0)) {
                securityToken.safeTransfer(trade.buyer, trade.tokenAmount);
            }
            if (trade.buyerDeposited) {
                uint256 platformFee = (trade.stableAmount * platformFeeBps) / 10000;
                uint256 sellerReceives = trade.stableAmount - platformFee;
                stablecoin.safeTransfer(trade.seller, sellerReceives);
                if (platformFee > 0) {
                    stablecoin.safeTransfer(platformFeeRecipient, platformFee);
                }
            }
        }

        trade.status = TradeStatus.CANCELLED;

        emit DisputeResolved(_tradeId, msg.sender, _sellerWins);
    }

    // ============ Admin Functions ============

    function setArbitrator(address _arbitrator, bool _approved) external onlyOwner {
        if (_arbitrator == address(0)) revert InvalidAddress();
        arbitrators[_arbitrator] = _approved;
        emit ArbitratorUpdated(_arbitrator, _approved);
    }

    function setPlatformFee(uint256 _feeBps) external onlyOwner {
        if (_feeBps > 1000) revert InvalidAmount(); // Max 10%
        uint256 oldFee = platformFeeBps;
        platformFeeBps = _feeBps;
        emit FeeUpdated(oldFee, _feeBps);
    }

    function setPlatformFeeRecipient(address _recipient) external onlyOwner {
        if (_recipient == address(0)) revert InvalidAddress();
        platformFeeRecipient = _recipient;
    }

    function setDefaultExpiration(uint256 _duration) external onlyOwner {
        defaultExpirationTime = _duration;
    }
    
    function setKYCVerifier(address _kycVerifier) external onlyOwner {
        if (_kycVerifier == address(0)) revert InvalidAddress();
        address oldVerifier = address(kycVerifier);
        kycVerifier = IKYCVerifier(_kycVerifier);
        emit KYCVerifierUpdated(oldVerifier, _kycVerifier);
    }
    
    function setDefaultMinKYCLevel(uint8 _level) external onlyOwner {
        if (_level > 4) revert InvalidKYCLevel();
        uint8 oldLevel = defaultMinKYCLevel;
        defaultMinKYCLevel = _level;
        emit MinKYCLevelUpdated(oldLevel, _level);
    }
    
    function setCountryRestriction(uint16 _countryCode, bool _restricted) external onlyOwner {
        _restrictedCountries[_countryCode] = _restricted;
        emit CountryRestrictionUpdated(_countryCode, _restricted);
    }
    
    function batchSetCountryRestrictions(
        uint16[] calldata _countryCodes,
        bool _restricted
    ) external onlyOwner {
        for (uint256 i = 0; i < _countryCodes.length; i++) {
            _restrictedCountries[_countryCodes[i]] = _restricted;
            emit CountryRestrictionUpdated(_countryCodes[i], _restricted);
        }
    }
    
    function setKYCEnforced(bool _enforced) external onlyOwner {
        kycEnforced = _enforced;
        emit KYCEnforcementUpdated(_enforced);
    }
    
    function setKYCCacheValidityDuration(uint256 _duration) external onlyOwner {
        uint256 oldDuration = kycCacheValidityDuration;
        kycCacheValidityDuration = _duration;
        emit KYCCacheValidityUpdated(oldDuration, _duration);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }

    // ============ View Functions ============

    function getTrade(uint256 _tradeId) external view returns (Trade memory) {
        return trades[_tradeId];
    }

    function getSellerTrades(address _seller) external view returns (uint256[] memory) {
        return sellerTrades[_seller];
    }

    function getBuyerTrades(address _buyer) external view returns (uint256[] memory) {
        return buyerTrades[_buyer];
    }

    function getActiveTradesCount() external view returns (uint256 count) {
        for (uint256 i = 0; i < tradeCounter; i++) {
            if (trades[i].status == TradeStatus.CREATED || 
                trades[i].status == TradeStatus.SELLER_DEPOSITED ||
                trades[i].status == TradeStatus.BUYER_DEPOSITED) {
                count++;
            }
        }
    }

    function getOpenTrades(uint256 _offset, uint256 _limit) external view returns (Trade[] memory) {
        uint256 count = 0;
        
        for (uint256 i = 0; i < tradeCounter; i++) {
            if (trades[i].status == TradeStatus.CREATED || 
                trades[i].status == TradeStatus.SELLER_DEPOSITED) {
                if (block.timestamp <= trades[i].expiresAt) {
                    count++;
                }
            }
        }

        if (_offset >= count) return new Trade[](0);

        uint256 resultSize = _limit;
        if (_offset + _limit > count) resultSize = count - _offset;

        Trade[] memory result = new Trade[](resultSize);
        uint256 found = 0;
        uint256 added = 0;

        for (uint256 i = 0; i < tradeCounter && added < resultSize; i++) {
            if (trades[i].status == TradeStatus.CREATED || 
                trades[i].status == TradeStatus.SELLER_DEPOSITED) {
                if (block.timestamp <= trades[i].expiresAt) {
                    if (found >= _offset) {
                        result[added] = trades[i];
                        added++;
                    }
                    found++;
                }
            }
        }

        return result;
    }

    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _totalVolume,
        uint256 _totalFees,
        uint256 _platformFeeBps
    ) {
        return (tradeCounter, totalVolume, totalFees, platformFeeBps);
    }
    
    /**
     * @notice Check if wallet has valid KYC for trading
     */
    function isKYCValid(address _wallet) external view returns (bool) {
        return _hasValidKYC(_wallet, defaultMinKYCLevel);
    }
    
    /**
     * @notice Check if wallet can participate in a specific trade
     */
    function canParticipateInTrade(
        address _wallet,
        uint256 _tradeId
    ) external view tradeExists(_tradeId) returns (bool) {
        Trade storage trade = trades[_tradeId];
        return _hasValidKYC(_wallet, trade.minKYCLevel);
    }
    
    /**
     * @notice Get cached KYC data for a wallet
     */
    function getCachedKYC(address _wallet) external view returns (
        uint8 level,
        uint16 countryCode,
        uint256 expiry,
        uint256 cachedAt,
        bool isValid
    ) {
        CachedKYC storage cached = _cachedKYC[_wallet];
        bool valid = _hasValidKYC(_wallet, 1);
        
        return (
            cached.level,
            cached.countryCode,
            cached.expiry,
            cached.cachedAt,
            valid
        );
    }
    
    /**
     * @notice Check if country is restricted
     */
    function isCountryRestricted(uint16 _countryCode) external view returns (bool) {
        return _restrictedCountries[_countryCode];
    }
    
    /**
     * @notice Get KYC verifier address
     */
    function getKYCVerifier() external view returns (address) {
        return address(kycVerifier);
    }
}