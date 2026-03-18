// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "../interfaces/IRWAProjectNFT.sol";
import "../libraries/Constants.sol";

contract RWAProjectNFT is Initializable, ERC721Upgradeable, ERC721URIStorageUpgradeable, ERC721EnumerableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable, IRWAProjectNFT {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    struct ProjectData {
        address owner;
        address securityToken;
        address escrowVault;
        ProjectStatus status;
        uint256 createdAt;
        uint256 fundingGoal;
        uint256 totalRaised;
        string name;
        string category;
    }

    uint256 private _tokenIdCounter;
    mapping(uint256 => ProjectData) public projects;
    mapping(address => uint256[]) private _ownerProjects;
    mapping(string => bool) private _nameExists;

    event ProjectCreated(uint256 indexed tokenId, address indexed owner, string name);
    event ProjectStatusUpdated(uint256 indexed tokenId, ProjectStatus oldStatus, ProjectStatus newStatus, address changedBy);
    event SecurityTokenLinked(uint256 indexed tokenId, address securityToken);
    event EscrowVaultLinked(uint256 indexed tokenId, address escrowVault);
    event FundingUpdated(uint256 indexed tokenId, uint256 totalRaised);
    event MetadataUpdated(uint256 indexed tokenId, string uri);

    error ProjectNotFound();
    error NameAlreadyExists();
    error InvalidStatus();
    error ZeroAddress();
    error NotProjectOwner();
    error SoulboundToken();
    error InvalidStatusTransition();
    error NotAuthorized();

    function initialize(string memory _name, string memory _symbol, address _admin) external initializer {
        if (_admin == address(0)) revert ZeroAddress();
        __ERC721_init(_name, _symbol);
        __ERC721URIStorage_init();
        __ERC721Enumerable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(MANAGER_ROLE, _admin);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function createProject(address _owner, string calldata _name, string calldata _category, uint256 _fundingGoal, string calldata _uri) external override onlyRole(MINTER_ROLE) whenNotPaused returns (uint256) {
        if (_owner == address(0)) revert ZeroAddress();
        if (_nameExists[_name]) revert NameAlreadyExists();

        uint256 tokenId = _tokenIdCounter++;
        _safeMint(_owner, tokenId);
        _setTokenURI(tokenId, _uri);

        projects[tokenId] = ProjectData({
            owner: _owner,
            securityToken: address(0),
            escrowVault: address(0),
            status: ProjectStatus.DRAFT,
            createdAt: block.timestamp,
            fundingGoal: _fundingGoal,
            totalRaised: 0,
            name: _name,
            category: _category
        });

        _ownerProjects[_owner].push(tokenId);
        _nameExists[_name] = true;

        emit ProjectCreated(tokenId, _owner, _name);
        return tokenId;
    }

    /**
     * @notice Update project status - MANAGER_ROLE only
     * @dev Status Flow:
     *   DRAFT -> ACTIVE (admin approves)
     *   ACTIVE -> FUNDED (when goal reached, auto or manual)
     *   FUNDED -> COMPLETED (all milestones done)
     *   Any -> CANCELLED (admin cancel)
     *   COMPLETED is final - cannot be changed
     */
    function updateProjectStatus(uint256 _tokenId, ProjectStatus _status) external override {
        if (_ownerOf(_tokenId) == address(0)) revert ProjectNotFound();
        
        ProjectData storage project = projects[_tokenId];
        ProjectStatus currentStatus = project.status;
        
        // No change needed
        if (currentStatus == _status) return;
        
        // Only managers can change status
        if (!hasRole(MANAGER_ROLE, msg.sender)) {
            revert NotAuthorized();
        }
        
        // Cannot revert from COMPLETED (final state)
        if (currentStatus == ProjectStatus.COMPLETED) {
            revert InvalidStatusTransition();
        }
        
        project.status = _status;
        emit ProjectStatusUpdated(_tokenId, currentStatus, _status, msg.sender);
    }

    function linkSecurityToken(uint256 _tokenId, address _securityToken) external override onlyRole(MANAGER_ROLE) {
        if (_ownerOf(_tokenId) == address(0)) revert ProjectNotFound();
        if (_securityToken == address(0)) revert ZeroAddress();
        projects[_tokenId].securityToken = _securityToken;
        emit SecurityTokenLinked(_tokenId, _securityToken);
    }

    function linkEscrowVault(uint256 _tokenId, address _escrowVault) external override onlyRole(MANAGER_ROLE) {
        if (_ownerOf(_tokenId) == address(0)) revert ProjectNotFound();
        if (_escrowVault == address(0)) revert ZeroAddress();
        projects[_tokenId].escrowVault = _escrowVault;
        emit EscrowVaultLinked(_tokenId, _escrowVault);
    }

    function updateTotalRaised(uint256 _tokenId, uint256 _amount) external override onlyRole(MANAGER_ROLE) {
        if (_ownerOf(_tokenId) == address(0)) revert ProjectNotFound();
        projects[_tokenId].totalRaised = _amount;
        emit FundingUpdated(_tokenId, _amount);
    }

    function incrementTotalRaised(uint256 _tokenId, uint256 _amount) external override onlyRole(MANAGER_ROLE) {
        if (_ownerOf(_tokenId) == address(0)) revert ProjectNotFound();
        projects[_tokenId].totalRaised += _amount;
        emit FundingUpdated(_tokenId, projects[_tokenId].totalRaised);
    }

    function updateMetadata(uint256 _tokenId, string calldata _uri) external {
        if (_ownerOf(_tokenId) == address(0)) revert ProjectNotFound();
        ProjectData storage project = projects[_tokenId];
        
        bool isManager = hasRole(MANAGER_ROLE, msg.sender);
        bool isOwner = project.owner == msg.sender;
        
        if (!isManager && !isOwner) revert NotAuthorized();
        
        // Owners can only update metadata in DRAFT status
        if (isOwner && !isManager) {
            if (project.status != ProjectStatus.DRAFT) {
                revert InvalidStatusTransition();
            }
        }
        
        _setTokenURI(_tokenId, _uri);
        emit MetadataUpdated(_tokenId, _uri);
    }

    function getProject(uint256 _tokenId) external view returns (ProjectData memory) {
        if (_ownerOf(_tokenId) == address(0)) revert ProjectNotFound();
        return projects[_tokenId];
    }

    function getOwnerProjects(address _owner) external view returns (uint256[] memory) { 
        return _ownerProjects[_owner]; 
    }
    
    function totalProjects() external view returns (uint256) { 
        return _tokenIdCounter; 
    }
    
    function projectExists(uint256 _tokenId) external view override returns (bool) { 
        return _ownerOf(_tokenId) != address(0); 
    }

    // Soulbound - no transfers allowed
    function transferFrom(address, address, uint256) public pure override(ERC721Upgradeable, IERC721Upgradeable) { 
        revert SoulboundToken(); 
    }
    
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override(ERC721Upgradeable, IERC721Upgradeable) { 
        revert SoulboundToken(); 
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721Upgradeable, ERC721URIStorageUpgradeable) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}