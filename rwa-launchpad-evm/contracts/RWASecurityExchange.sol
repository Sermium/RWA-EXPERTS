// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IKYCVerifier.sol";

interface IRWASecurityToken {
    function isLocked(address _account) external view returns (bool);
    function frozen(address _account) external view returns (bool);
}

/**
 * @title RWASecurityExchange
 * @notice Decentralized exchange for RWA security tokens with off-chain KYC verification
 * @dev Uses KYCVerifier for signature-based KYC instead of on-chain IdentityRegistry
 */
contract RWASecurityExchange is 
    Initializable, 
    AccessControlUpgradeable, 
    UUPSUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable 
{
    using SafeERC20 for IERC20;

    // ============ Roles ============
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ============ Enums ============
    enum OrderSide { Buy, Sell }
    enum OrderStatus { Active, Filled, PartiallyFilled, Cancelled }

    // ============ Structs ============
    struct Order {
        uint256 id;
        address trader;
        address securityToken;
        address paymentToken;
        OrderSide side;
        uint256 price;
        uint256 amount;
        uint256 filled;
        uint256 createdAt;
        OrderStatus status;
    }

    struct TradingPair {
        address securityToken;
        address paymentToken;
        bool active;
        uint256 lastPrice;
        uint256 totalVolume;
        uint256 tradesCount;
        uint256 createdAt;
        uint8 minKYCLevel; // Minimum KYC level for this pair
    }

    struct Trade {
        uint256 id;
        uint256 buyOrderId;
        uint256 sellOrderId;
        address buyer;
        address seller;
        address securityToken;
        address paymentToken;
        uint256 price;
        uint256 amount;
        uint256 timestamp;
    }

    /// @notice KYC proof data for signature verification
    struct KYCProof {
        uint8 level;
        uint16 countryCode;
        uint256 expiry;
        bytes signature;
    }

    // ============ State Variables ============
    IKYCVerifier public kycVerifier;
    address public defaultPaymentToken;
    uint256 public makerFeeBps;
    uint256 public takerFeeBps;
    address public feeCollector;
    uint256 private _orderCounter;
    uint256 private _tradeCounter;

    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public userOrders;
    mapping(bytes32 => TradingPair) public tradingPairs;
    mapping(address => bool) public acceptedPaymentTokens;
    mapping(bytes32 => uint256[]) public buyOrderBook;
    mapping(bytes32 => uint256[]) public sellOrderBook;
    mapping(uint256 => Trade) public trades;
    mapping(bytes32 => uint256[]) public pairTrades;

    /// @notice Restricted countries per trading pair (pairId => countryCode => restricted)
    mapping(bytes32 => mapping(uint16 => bool)) public pairRestrictedCountries;

    /// @notice Default restricted countries for all pairs
    uint16[] public defaultRestrictedCountries;

    /// @notice Default minimum KYC level for new pairs
    uint8 public defaultMinKYCLevel;

    bool public autoCreatePairs;

    // ============ Events ============
    event TradingPairCreated(address indexed securityToken, address indexed paymentToken, bytes32 pairId, uint8 minKYCLevel);
    event TradingPairStatusChanged(bytes32 indexed pairId, bool active);
    event TradingPairKYCLevelChanged(bytes32 indexed pairId, uint8 oldLevel, uint8 newLevel);
    event OrderCreated(uint256 indexed orderId, address indexed trader, address securityToken, address paymentToken, OrderSide side, uint256 price, uint256 amount);
    event OrderCancelled(uint256 indexed orderId);
    event OrderFilled(uint256 indexed orderId, uint256 filledAmount, uint256 remainingAmount);
    event TradeExecuted(uint256 indexed tradeId, uint256 indexed buyOrderId, uint256 indexed sellOrderId, address buyer, address seller, uint256 price, uint256 amount, uint256 buyerFee, uint256 sellerFee);
    event FeesUpdated(uint256 makerFeeBps, uint256 takerFeeBps);
    event FeeCollectorUpdated(address indexed newCollector);
    event KYCVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event PairCountryRestrictionUpdated(bytes32 indexed pairId, uint16 countryCode, bool restricted);
    event DefaultRestrictedCountryUpdated(uint16 countryCode, bool restricted);
    event DefaultMinKYCLevelUpdated(uint8 oldLevel, uint8 newLevel);

    // ============ Errors ============
    error InvalidKYCProof();
    error KYCLevelTooLow(uint8 required, uint8 provided);
    error KYCExpired();
    error CountryRestricted(uint16 countryCode);
    error InvalidKYCLevel();
    error PairNotActive();
    error AccountFrozen();
    error TokensLocked();
    error InvalidPrice();
    error InvalidAmount();
    error NotOrderOwner();
    error CannotCancelOrder();
    error PairAlreadyExists();
    error PairDoesNotExist();
    error PaymentTokenNotAccepted();
    error InvalidSecurityToken();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _admin,
        address _kycVerifier,
        address _defaultPaymentToken,
        address _feeCollector
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);

        kycVerifier = IKYCVerifier(_kycVerifier);
        defaultPaymentToken = _defaultPaymentToken;
        feeCollector = _feeCollector;
        makerFeeBps = 10;
        takerFeeBps = 25;
        acceptedPaymentTokens[_defaultPaymentToken] = true;
        autoCreatePairs = true;
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
        uint8 _minLevel,
        bytes32 _pairId
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

        // Check level
        if (_proof.level < _minLevel) {
            revert KYCLevelTooLow(_minLevel, _proof.level);
        }

        // Check expiry
        if (block.timestamp > _proof.expiry) {
            revert KYCExpired();
        }

        // Check country restrictions
        if (_isCountryRestricted(_proof.countryCode, _pairId)) {
            revert CountryRestricted(_proof.countryCode);
        }
    }

    /**
     * @notice Check if a country is restricted for a pair
     */
    function _isCountryRestricted(uint16 _countryCode, bytes32 _pairId) internal view returns (bool) {
        // Check pair-specific restriction first
        if (_pairId != bytes32(0) && pairRestrictedCountries[_pairId][_countryCode]) {
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

    // ============ Trading Pair Management ============

    function createTradingPair(
        address _securityToken,
        address _paymentToken
    ) external onlyRole(OPERATOR_ROLE) returns (bytes32 pairId) {
        return _createTradingPair(_securityToken, _paymentToken, defaultMinKYCLevel);
    }

    function createTradingPairWithKYCLevel(
        address _securityToken,
        address _paymentToken,
        uint8 _minKYCLevel
    ) external onlyRole(OPERATOR_ROLE) returns (bytes32 pairId) {
        if (_minKYCLevel > 4) revert InvalidKYCLevel();
        return _createTradingPair(_securityToken, _paymentToken, _minKYCLevel);
    }

    function _createTradingPair(
        address _securityToken,
        address _paymentToken,
        uint8 _minKYCLevel
    ) internal returns (bytes32 pairId) {
        if (_securityToken == address(0)) revert InvalidSecurityToken();
        if (!acceptedPaymentTokens[_paymentToken]) revert PaymentTokenNotAccepted();

        pairId = keccak256(abi.encodePacked(_securityToken, _paymentToken));
        if (tradingPairs[pairId].securityToken != address(0)) revert PairAlreadyExists();

        tradingPairs[pairId] = TradingPair({
            securityToken: _securityToken,
            paymentToken: _paymentToken,
            active: true,
            lastPrice: 0,
            totalVolume: 0,
            tradesCount: 0,
            createdAt: block.timestamp,
            minKYCLevel: _minKYCLevel
        });

        emit TradingPairCreated(_securityToken, _paymentToken, pairId, _minKYCLevel);
        return pairId;
    }

    function createPairForToken(
        address _securityToken
    ) external onlyRole(FACTORY_ROLE) returns (bytes32) {
        require(autoCreatePairs, "Auto-create disabled");
        return _createTradingPair(_securityToken, defaultPaymentToken, defaultMinKYCLevel);
    }

    function createPairsForToken(
        address _securityToken,
        address[] calldata _paymentTokens
    ) external onlyRole(OPERATOR_ROLE) {
        for (uint256 i = 0; i < _paymentTokens.length; i++) {
            if (acceptedPaymentTokens[_paymentTokens[i]]) {
                bytes32 pairId = keccak256(abi.encodePacked(_securityToken, _paymentTokens[i]));
                if (tradingPairs[pairId].securityToken == address(0)) {
                    _createTradingPair(_securityToken, _paymentTokens[i], defaultMinKYCLevel);
                }
            }
        }
    }

    function setTradingPairStatus(
        bytes32 _pairId,
        bool _active
    ) external onlyRole(OPERATOR_ROLE) {
        if (tradingPairs[_pairId].securityToken == address(0)) revert PairDoesNotExist();
        tradingPairs[_pairId].active = _active;
        emit TradingPairStatusChanged(_pairId, _active);
    }

    function setTradingPairKYCLevel(
        bytes32 _pairId,
        uint8 _minKYCLevel
    ) external onlyRole(OPERATOR_ROLE) {
        if (tradingPairs[_pairId].securityToken == address(0)) revert PairDoesNotExist();
        if (_minKYCLevel > 4) revert InvalidKYCLevel();

        uint8 oldLevel = tradingPairs[_pairId].minKYCLevel;
        tradingPairs[_pairId].minKYCLevel = _minKYCLevel;
        emit TradingPairKYCLevelChanged(_pairId, oldLevel, _minKYCLevel);
    }

    // ============ Order Management ============

    /**
     * @notice Create an order with KYC verification
     * @param _securityToken Security token address
     * @param _paymentToken Payment token address
     * @param _side Buy or Sell
     * @param _price Price per token
     * @param _amount Amount of tokens
     * @param _kycProof KYC proof from backend
     */
    function createOrder(
        address _securityToken,
        address _paymentToken,
        OrderSide _side,
        uint256 _price,
        uint256 _amount,
        KYCProof calldata _kycProof
    ) external nonReentrant whenNotPaused returns (uint256 orderId) {
        if (_price == 0) revert InvalidPrice();
        if (_amount == 0) revert InvalidAmount();

        bytes32 pairId = keccak256(abi.encodePacked(_securityToken, _paymentToken));
        TradingPair storage pair = tradingPairs[pairId];
        if (!pair.active) revert PairNotActive();

        // Verify KYC
        _verifyKYCProof(msg.sender, _kycProof, pair.minKYCLevel, pairId);

        // Check token restrictions
        IRWASecurityToken secToken = IRWASecurityToken(_securityToken);
        if (secToken.frozen(msg.sender)) revert AccountFrozen();

        if (_side == OrderSide.Sell) {
            if (secToken.isLocked(msg.sender)) revert TokensLocked();
            IERC20(_securityToken).safeTransferFrom(msg.sender, address(this), _amount);
        } else {
            uint256 totalCost = (_price * _amount) / 1e18;
            IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), totalCost);
        }

        _orderCounter++;
        orderId = _orderCounter;

        orders[orderId] = Order({
            id: orderId,
            trader: msg.sender,
            securityToken: _securityToken,
            paymentToken: _paymentToken,
            side: _side,
            price: _price,
            amount: _amount,
            filled: 0,
            createdAt: block.timestamp,
            status: OrderStatus.Active
        });

        userOrders[msg.sender].push(orderId);

        if (_side == OrderSide.Buy) {
            _insertBuyOrder(pairId, orderId, _price);
        } else {
            _insertSellOrder(pairId, orderId, _price);
        }

        emit OrderCreated(orderId, msg.sender, _securityToken, _paymentToken, _side, _price, _amount);

        _matchOrders(pairId);

        return orderId;
    }

    function cancelOrder(uint256 _orderId) external nonReentrant {
        Order storage order = orders[_orderId];
        if (order.trader != msg.sender) revert NotOrderOwner();
        if (order.status != OrderStatus.Active && order.status != OrderStatus.PartiallyFilled) {
            revert CannotCancelOrder();
        }

        uint256 remainingAmount = order.amount - order.filled;
        order.status = OrderStatus.Cancelled;

        bytes32 pairId = keccak256(abi.encodePacked(order.securityToken, order.paymentToken));

        if (order.side == OrderSide.Buy) {
            _removeFromOrderBook(buyOrderBook[pairId], _orderId);
            uint256 refund = (order.price * remainingAmount) / 1e18;
            IERC20(order.paymentToken).safeTransfer(msg.sender, refund);
        } else {
            _removeFromOrderBook(sellOrderBook[pairId], _orderId);
            IERC20(order.securityToken).safeTransfer(msg.sender, remainingAmount);
        }

        emit OrderCancelled(_orderId);
    }

    // ============ Order Matching ============

    function _matchOrders(bytes32 _pairId) internal {
        uint256[] storage buyOrders = buyOrderBook[_pairId];
        uint256[] storage sellOrders = sellOrderBook[_pairId];

        while (buyOrders.length > 0 && sellOrders.length > 0) {
            Order storage buyOrder = orders[buyOrders[0]];
            Order storage sellOrder = orders[sellOrders[0]];

            if (buyOrder.price < sellOrder.price) {
                break;
            }

            uint256 buyRemaining = buyOrder.amount - buyOrder.filled;
            uint256 sellRemaining = sellOrder.amount - sellOrder.filled;
            uint256 tradeAmount = buyRemaining < sellRemaining ? buyRemaining : sellRemaining;

            _executeTrade(buyOrder, sellOrder, sellOrder.price, tradeAmount, _pairId);

            if (buyOrder.filled == buyOrder.amount) {
                buyOrder.status = OrderStatus.Filled;
                _removeFirstFromOrderBook(buyOrders);
            } else {
                buyOrder.status = OrderStatus.PartiallyFilled;
            }

            if (sellOrder.filled == sellOrder.amount) {
                sellOrder.status = OrderStatus.Filled;
                _removeFirstFromOrderBook(sellOrders);
            } else {
                sellOrder.status = OrderStatus.PartiallyFilled;
            }
        }
    }

    function _executeTrade(
        Order storage _buyOrder,
        Order storage _sellOrder,
        uint256 _price,
        uint256 _amount,
        bytes32 _pairId
    ) internal {
        uint256 paymentAmount = (_price * _amount) / 1e18;
        uint256 buyerFee = (paymentAmount * takerFeeBps) / 10000;
        uint256 sellerFee = (paymentAmount * makerFeeBps) / 10000;

        // Older order is maker, newer is taker
        if (_buyOrder.createdAt < _sellOrder.createdAt) {
            uint256 temp = buyerFee;
            buyerFee = sellerFee;
            sellerFee = temp;
        }

        _buyOrder.filled += _amount;
        _sellOrder.filled += _amount;

        // Transfer tokens to buyer
        IERC20(_buyOrder.securityToken).safeTransfer(_buyOrder.trader, _amount);

        // Transfer payment to seller (minus fee)
        IERC20(_buyOrder.paymentToken).safeTransfer(_sellOrder.trader, paymentAmount - sellerFee);

        // Refund excess payment to buyer
        uint256 buyerPaid = (_buyOrder.price * _amount) / 1e18;
        uint256 buyerRefund = buyerPaid - paymentAmount - buyerFee;
        if (buyerRefund > 0) {
            IERC20(_buyOrder.paymentToken).safeTransfer(_buyOrder.trader, buyerRefund);
        }

        // Collect fees
        uint256 totalFees = buyerFee + sellerFee;
        if (totalFees > 0 && feeCollector != address(0)) {
            IERC20(_buyOrder.paymentToken).safeTransfer(feeCollector, totalFees);
        }

        // Record trade
        _tradeCounter++;
        trades[_tradeCounter] = Trade({
            id: _tradeCounter,
            buyOrderId: _buyOrder.id,
            sellOrderId: _sellOrder.id,
            buyer: _buyOrder.trader,
            seller: _sellOrder.trader,
            securityToken: _buyOrder.securityToken,
            paymentToken: _buyOrder.paymentToken,
            price: _price,
            amount: _amount,
            timestamp: block.timestamp
        });

        pairTrades[_pairId].push(_tradeCounter);

        // Update pair stats
        TradingPair storage pair = tradingPairs[_pairId];
        pair.lastPrice = _price;
        pair.totalVolume += paymentAmount;
        pair.tradesCount++;

        emit TradeExecuted(
            _tradeCounter,
            _buyOrder.id,
            _sellOrder.id,
            _buyOrder.trader,
            _sellOrder.trader,
            _price,
            _amount,
            buyerFee,
            sellerFee
        );
        emit OrderFilled(_buyOrder.id, _buyOrder.filled, _buyOrder.amount - _buyOrder.filled);
        emit OrderFilled(_sellOrder.id, _sellOrder.filled, _sellOrder.amount - _sellOrder.filled);
    }

    // ============ Order Book Management ============

    function _insertBuyOrder(bytes32 _pairId, uint256 _orderId, uint256 _price) internal {
        uint256[] storage book = buyOrderBook[_pairId];
        uint256 i = book.length;
        book.push(_orderId);
        while (i > 0 && orders[book[i - 1]].price < _price) {
            book[i] = book[i - 1];
            i--;
        }
        book[i] = _orderId;
    }

    function _insertSellOrder(bytes32 _pairId, uint256 _orderId, uint256 _price) internal {
        uint256[] storage book = sellOrderBook[_pairId];
        uint256 i = book.length;
        book.push(_orderId);
        while (i > 0 && orders[book[i - 1]].price > _price) {
            book[i] = book[i - 1];
            i--;
        }
        book[i] = _orderId;
    }

    function _removeFromOrderBook(uint256[] storage _book, uint256 _orderId) internal {
        for (uint256 i = 0; i < _book.length; i++) {
            if (_book[i] == _orderId) {
                _book[i] = _book[_book.length - 1];
                _book.pop();
                break;
            }
        }
    }

    function _removeFirstFromOrderBook(uint256[] storage _book) internal {
        if (_book.length > 0) {
            for (uint256 i = 0; i < _book.length - 1; i++) {
                _book[i] = _book[i + 1];
            }
            _book.pop();
        }
    }

    // ============ Country Restriction Management ============

    function setPairCountryRestriction(
        bytes32 _pairId,
        uint16 _countryCode,
        bool _restricted
    ) external onlyRole(OPERATOR_ROLE) {
        if (tradingPairs[_pairId].securityToken == address(0)) revert PairDoesNotExist();
        pairRestrictedCountries[_pairId][_countryCode] = _restricted;
        emit PairCountryRestrictionUpdated(_pairId, _countryCode, _restricted);
    }

    function batchSetPairCountryRestrictions(
        bytes32 _pairId,
        uint16[] calldata _countryCodes,
        bool _restricted
    ) external onlyRole(OPERATOR_ROLE) {
        if (tradingPairs[_pairId].securityToken == address(0)) revert PairDoesNotExist();

        uint256 length = _countryCodes.length;
        for (uint256 i = 0; i < length; ++i) {
            pairRestrictedCountries[_pairId][_countryCodes[i]] = _restricted;
            emit PairCountryRestrictionUpdated(_pairId, _countryCodes[i], _restricted);
        }
    }

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

    function getDefaultRestrictedCountries() external view returns (uint16[] memory) {
        return defaultRestrictedCountries;
    }

    function isCountryRestricted(uint16 _countryCode, bytes32 _pairId) external view returns (bool) {
        return _isCountryRestricted(_countryCode, _pairId);
    }

    // ============ View Functions ============

    function getPairId(address _securityToken, address _paymentToken) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(_securityToken, _paymentToken));
    }

    function getTradingPair(address _securityToken, address _paymentToken) external view returns (TradingPair memory) {
        bytes32 pairId = keccak256(abi.encodePacked(_securityToken, _paymentToken));
        return tradingPairs[pairId];
    }

    function validPairs(address _securityToken, address _paymentToken) external view returns (bool) {
        bytes32 pairId = keccak256(abi.encodePacked(_securityToken, _paymentToken));
        return tradingPairs[pairId].active;
    }

    function getOrder(uint256 _orderId) external view returns (Order memory) {
        return orders[_orderId];
    }

    function getUserOrders(address _user) external view returns (uint256[] memory) {
        return userOrders[_user];
    }

    function getUserActiveOrders(address _user) external view returns (Order[] memory) {
        uint256[] memory orderIds = userOrders[_user];
        uint256 activeCount = 0;

        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].status == OrderStatus.Active || 
                orders[orderIds[i]].status == OrderStatus.PartiallyFilled) {
                activeCount++;
            }
        }

        Order[] memory activeOrders = new Order[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].status == OrderStatus.Active || 
                orders[orderIds[i]].status == OrderStatus.PartiallyFilled) {
                activeOrders[index] = orders[orderIds[i]];
                index++;
            }
        }

        return activeOrders;
    }

    function getOrderBook(
        address _securityToken,
        address _paymentToken,
        uint256 _limit
    ) external view returns (Order[] memory buyOrders, Order[] memory sellOrders) {
        bytes32 pairId = keccak256(abi.encodePacked(_securityToken, _paymentToken));
        uint256[] storage buyIds = buyOrderBook[pairId];
        uint256[] storage sellIds = sellOrderBook[pairId];

        uint256 buyCount = buyIds.length < _limit ? buyIds.length : _limit;
        uint256 sellCount = sellIds.length < _limit ? sellIds.length : _limit;

        buyOrders = new Order[](buyCount);
        sellOrders = new Order[](sellCount);

        for (uint256 i = 0; i < buyCount; i++) {
            buyOrders[i] = orders[buyIds[i]];
        }
        for (uint256 i = 0; i < sellCount; i++) {
            sellOrders[i] = orders[sellIds[i]];
        }

        return (buyOrders, sellOrders);
    }

    function getTrade(uint256 _tradeId) external view returns (Trade memory) {
        return trades[_tradeId];
    }

    function getPairTrades(bytes32 _pairId, uint256 _limit) external view returns (Trade[] memory) {
        uint256[] storage tradeIds = pairTrades[_pairId];
        uint256 count = tradeIds.length < _limit ? tradeIds.length : _limit;

        Trade[] memory result = new Trade[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = trades[tradeIds[tradeIds.length - 1 - i]];
        }

        return result;
    }

    function getTotalOrders() external view returns (uint256) {
        return _orderCounter;
    }

    function getTotalTrades() external view returns (uint256) {
        return _tradeCounter;
    }

    function getKYCVerifier() external view returns (address) {
        return address(kycVerifier);
    }

    // ============ Admin Functions ============

    function setFees(uint256 _makerFeeBps, uint256 _takerFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_makerFeeBps <= 100, "Maker fee too high");
        require(_takerFeeBps <= 100, "Taker fee too high");
        makerFeeBps = _makerFeeBps;
        takerFeeBps = _takerFeeBps;
        emit FeesUpdated(_makerFeeBps, _takerFeeBps);
    }

    function setFeeCollector(address _feeCollector) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feeCollector = _feeCollector;
        emit FeeCollectorUpdated(_feeCollector);
    }

    function setAcceptedPaymentToken(address _token, bool _accepted) external onlyRole(OPERATOR_ROLE) {
        acceptedPaymentTokens[_token] = _accepted;
    }

    function setAutoCreatePairs(bool _enabled) external onlyRole(OPERATOR_ROLE) {
        autoCreatePairs = _enabled;
    }

    function setKYCVerifier(address _kycVerifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit KYCVerifierUpdated(address(kycVerifier), _kycVerifier);
        kycVerifier = IKYCVerifier(_kycVerifier);
    }

    function setDefaultPaymentToken(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(acceptedPaymentTokens[_token], "Token not accepted");
        defaultPaymentToken = _token;
    }

    function setDefaultMinKYCLevel(uint8 _level) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_level > 4) revert InvalidKYCLevel();
        uint8 oldLevel = defaultMinKYCLevel;
        defaultMinKYCLevel = _level;
        emit DefaultMinKYCLevelUpdated(oldLevel, _level);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function emergencyWithdraw(address _token, uint256 _amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(_token).safeTransfer(msg.sender, _amount);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
