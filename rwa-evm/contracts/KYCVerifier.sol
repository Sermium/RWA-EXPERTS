// contracts/kyc/KYCVerifier.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/**
 * @title KYCVerifier
 * @notice Verifies off-chain KYC proofs signed by a trusted backend
 * @dev Collects registration fee and validates EIP-712 signatures
 */
contract KYCVerifier is 
    Initializable, 
    OwnableUpgradeable, 
    UUPSUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ============ Constants ============
    
    uint8 public constant LEVEL_NONE = 0;
    uint8 public constant LEVEL_BASIC = 1;
    uint8 public constant LEVEL_STANDARD = 2;
    uint8 public constant LEVEL_ACCREDITED = 3;
    uint8 public constant LEVEL_INSTITUTIONAL = 4;

    bytes32 private constant KYC_PROOF_TYPEHASH = keccak256(
        "KYCProof(address wallet,uint8 level,uint16 countryCode,uint256 expiry)"
    );

    // ============ State Variables ============
    
    /// @notice Address that signs KYC proofs (backend wallet)
    address public trustedSigner;
    
    /// @notice Registration fee in native currency
    uint256 public registrationFee;
    
    /// @notice Fee recipient address
    address public feeRecipient;
    
    /// @notice Mapping of registered wallets
    mapping(address => bool) public isRegistered;
    
    /// @notice Mapping of wallet => registration timestamp
    mapping(address => uint256) public registeredAt;
    
    /// @notice Total fees collected
    uint256 public totalFeesCollected;
    
    /// @notice Domain separator for EIP-712
    bytes32 private _domainSeparator;

    // ============ Events ============
    
    event TrustedSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event RegistrationFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event WalletRegistered(address indexed wallet, uint8 level, uint16 countryCode, uint256 fee);
    event FeesWithdrawn(address indexed recipient, uint256 amount);

    // ============ Errors ============
    
    error InvalidSignature();
    error ProofExpired();
    error InvalidLevel();
    error ZeroAddress();
    error InsufficientFee();
    error AlreadyRegistered();
    error TransferFailed();
    error CountryRestricted();

    // ============ Initializer ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the KYC verifier
     * @param _trustedSigner Address of the backend signer
     * @param _registrationFee Fee to register (in wei)
     * @param _feeRecipient Address to receive fees
     */
    function initialize(
        address _trustedSigner,
        uint256 _registrationFee,
        address _feeRecipient
    ) external initializer {
        if (_trustedSigner == address(0)) revert ZeroAddress();
        if (_feeRecipient == address(0)) revert ZeroAddress();
        
        __Ownable_init();
        _transferOwnership(msg.sender);
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        
        trustedSigner = _trustedSigner;
        registrationFee = _registrationFee;
        feeRecipient = _feeRecipient;
        
        _domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("RWA KYC Verifier")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
        
        emit TrustedSignerUpdated(address(0), _trustedSigner);
        emit RegistrationFeeUpdated(0, _registrationFee);
        emit FeeRecipientUpdated(address(0), _feeRecipient);
    }

    // ============ Registration Function ============
    
    /**
     * @notice Register wallet with KYC proof and pay fee
     * @dev Verifies the proof signature and collects the fee
     * @param level KYC level (1-4)
     * @param countryCode ISO 3166-1 numeric country code
     * @param expiry Proof expiration timestamp
     * @param signature Backend signature of the proof
     */
    function registerWithProof(
    uint8 level,
    uint16 countryCode,
    uint256 expiry,
    bytes calldata signature
) external payable nonReentrant whenNotPaused {    
    if (msg.value < registrationFee) revert InsufficientFee();
    if (level == 0 || level > LEVEL_INSTITUTIONAL) revert InvalidLevel();
    if (expiry < block.timestamp) revert ProofExpired();
    
    // Verify the signature
    bool valid = verify(msg.sender, level, countryCode, expiry, signature);
    if (!valid) revert InvalidSignature();
    
    // Track registration (for records, not blocking)
    if (!isRegistered[msg.sender]) {
        isRegistered[msg.sender] = true;
        registeredAt[msg.sender] = block.timestamp;
    }
    
    totalFeesCollected += msg.value;
    
    // Transfer fee to recipient
    (bool success, ) = feeRecipient.call{value: msg.value}("");
    if (!success) revert TransferFailed();
    
    emit WalletRegistered(msg.sender, level, countryCode, msg.value);
}

    // ============ Verification Functions ============
    
    /**
     * @notice Verify a KYC proof signature
     * @param wallet Address the proof is for
     * @param level KYC level
     * @param countryCode Country code
     * @param expiry Expiration timestamp
     * @param signature EIP-712 signature
     * @return bool True if signature is valid
     */
    function verify(
        address wallet,
        uint8 level,
        uint16 countryCode,
        uint256 expiry,
        bytes calldata signature
    ) public view returns (bool) {
        if (expiry < block.timestamp) return false;
        
        bytes32 structHash = keccak256(
            abi.encode(
                KYC_PROOF_TYPEHASH,
                wallet,
                level,
                countryCode,
                expiry
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", _domainSeparator, structHash)
        );
        
        address signer = _recoverSigner(digest, signature);
        return signer == trustedSigner;
    }
    
    /**
     * @notice Verify proof and revert if invalid
     */
    function verifyOrRevert(
        address wallet,
        uint8 level,
        uint16 countryCode,
        uint256 expiry,
        bytes calldata signature
    ) external view {
        if (!verify(wallet, level, countryCode, expiry, signature)) {
            revert InvalidSignature();
        }
        if (expiry < block.timestamp) {
            revert ProofExpired();
        }
    }
    
    /**
     * @notice Verify proof meets minimum level
     */
    function verifyWithMinLevel(
        address wallet,
        uint8 level,
        uint16 countryCode,
        uint256 expiry,
        bytes calldata signature,
        uint8 minLevel
    ) external view returns (bool) {
        if (level < minLevel) return false;
        return verify(wallet, level, countryCode, expiry, signature);
    }

    // ============ Internal Functions ============
    
    function _recoverSigner(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) return address(0);
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        
        return ecrecover(digest, v, r, s);
    }

    // ============ Admin Functions ============
    
    function setTrustedSigner(address _trustedSigner) external onlyOwner {
        if (_trustedSigner == address(0)) revert ZeroAddress();
        address oldSigner = trustedSigner;
        trustedSigner = _trustedSigner;
        emit TrustedSignerUpdated(oldSigner, _trustedSigner);
    }
    
    function setRegistrationFee(uint256 _fee) external onlyOwner {
        uint256 oldFee = registrationFee;
        registrationFee = _fee;
        emit RegistrationFeeUpdated(oldFee, _fee);
    }
    
    function setFeeRecipient(address _recipient) external onlyOwner {
        if (_recipient == address(0)) revert ZeroAddress();
        address oldRecipient = feeRecipient;
        feeRecipient = _recipient;
        emit FeeRecipientUpdated(oldRecipient, _recipient);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency withdraw stuck funds
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = owner().call{value: balance}("");
            if (!success) revert TransferFailed();
            emit FeesWithdrawn(owner(), balance);
        }
    }

    // ============ View Functions ============
    
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparator;
    }
    
    function getRegistrationInfo(address wallet) external view returns (
        bool registered,
        uint256 registrationTime
    ) {
        return (isRegistered[wallet], registeredAt[wallet]);
    }

    // ============ Upgrade Authorization ============
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    // ============ Receive ============
    
    receive() external payable {}
}