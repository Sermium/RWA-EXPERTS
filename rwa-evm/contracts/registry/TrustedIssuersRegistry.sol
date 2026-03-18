// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/ITrustedIssuersRegistry.sol";
import "../libraries/Constants.sol";

contract TrustedIssuersRegistry is Initializable, UUPSUpgradeable, OwnableUpgradeable, ITrustedIssuersRegistry {
    address[] private _trustedIssuers;
    mapping(address => uint256) private _issuerIndex;
    mapping(address => uint256[]) private _issuerClaimTopics;
    mapping(address => mapping(uint256 => bool)) private _hasClaimTopic;
    mapping(uint256 => address[]) private _claimTopicToIssuers;
    mapping(uint256 => mapping(address => uint256)) private _issuerIndexInTopic;

    error InvalidAddress();
    error IssuerAlreadyExists();
    error IssuerNotFound();
    error TooManyIssuers();
    error TooManyClaimTopics();

    function initialize(address _owner) external initializer {
        if (_owner == address(0)) revert InvalidAddress();
        __Ownable_init();
        transferOwnership(_owner);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function addTrustedIssuer(address _issuer, uint256[] calldata _claimTopics) external override onlyOwner {
        if (_issuer == address(0)) revert InvalidAddress();
        if (_issuerIndex[_issuer] != 0) revert IssuerAlreadyExists();
        if (_trustedIssuers.length >= Constants.MAX_TRUSTED_ISSUERS) revert TooManyIssuers();
        if (_claimTopics.length > Constants.MAX_CLAIM_TOPICS) revert TooManyClaimTopics();

        _trustedIssuers.push(_issuer);
        _issuerIndex[_issuer] = _trustedIssuers.length;
        _issuerClaimTopics[_issuer] = _claimTopics;

        uint256 length = _claimTopics.length;
        for (uint256 i = 0; i < length; ++i) {
            _hasClaimTopic[_issuer][_claimTopics[i]] = true;
            _addIssuerToClaimTopic(_issuer, _claimTopics[i]);
        }

        emit TrustedIssuerAdded(_issuer, _claimTopics);
    }

    function removeTrustedIssuer(address _issuer) external override onlyOwner {
        uint256 indexPlusOne = _issuerIndex[_issuer];
        if (indexPlusOne == 0) revert IssuerNotFound();

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = _trustedIssuers.length - 1;

        if (index != lastIndex) {
            address lastIssuer = _trustedIssuers[lastIndex];
            _trustedIssuers[index] = lastIssuer;
            _issuerIndex[lastIssuer] = indexPlusOne;
        }

        _trustedIssuers.pop();
        delete _issuerIndex[_issuer];

        uint256[] storage topics = _issuerClaimTopics[_issuer];
        uint256 topicsLength = topics.length;
        for (uint256 i = 0; i < topicsLength; ++i) {
            _removeIssuerFromClaimTopic(_issuer, topics[i]);
            delete _hasClaimTopic[_issuer][topics[i]];
        }
        delete _issuerClaimTopics[_issuer];

        emit TrustedIssuerRemoved(_issuer);
    }

    function updateIssuerClaimTopics(address _issuer, uint256[] calldata _claimTopics) external override onlyOwner {
        if (_issuerIndex[_issuer] == 0) revert IssuerNotFound();
        if (_claimTopics.length > Constants.MAX_CLAIM_TOPICS) revert TooManyClaimTopics();

        uint256[] storage oldTopics = _issuerClaimTopics[_issuer];
        uint256 oldLength = oldTopics.length;
        for (uint256 i = 0; i < oldLength; ++i) {
            _removeIssuerFromClaimTopic(_issuer, oldTopics[i]);
            delete _hasClaimTopic[_issuer][oldTopics[i]];
        }

        _issuerClaimTopics[_issuer] = _claimTopics;
        uint256 newLength = _claimTopics.length;
        for (uint256 i = 0; i < newLength; ++i) {
            _hasClaimTopic[_issuer][_claimTopics[i]] = true;
            _addIssuerToClaimTopic(_issuer, _claimTopics[i]);
        }

        emit ClaimTopicsUpdated(_issuer, _claimTopics);
    }

    function _addIssuerToClaimTopic(address _issuer, uint256 _topic) internal {
        if (_issuerIndexInTopic[_topic][_issuer] == 0) {
            _claimTopicToIssuers[_topic].push(_issuer);
            _issuerIndexInTopic[_topic][_issuer] = _claimTopicToIssuers[_topic].length;
        }
    }

    function _removeIssuerFromClaimTopic(address _issuer, uint256 _topic) internal {
        uint256 indexPlusOne = _issuerIndexInTopic[_topic][_issuer];
        if (indexPlusOne == 0) return;

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = _claimTopicToIssuers[_topic].length - 1;

        if (index != lastIndex) {
            address lastIssuer = _claimTopicToIssuers[_topic][lastIndex];
            _claimTopicToIssuers[_topic][index] = lastIssuer;
            _issuerIndexInTopic[_topic][lastIssuer] = indexPlusOne;
        }

        _claimTopicToIssuers[_topic].pop();
        delete _issuerIndexInTopic[_topic][_issuer];
    }

    // ============ View Functions ============

    function getTrustedIssuers() external view override returns (address[] memory) {
        return _trustedIssuers;
    }

    function getTrustedIssuersForClaimTopic(uint256 _claimTopic) external view override returns (address[] memory) {
        return _claimTopicToIssuers[_claimTopic];
    }

    function isTrustedIssuer(address _issuer) external view override returns (bool) {
        return _issuerIndex[_issuer] != 0;
    }

    function getTrustedIssuerClaimTopics(address _issuer) external view override returns (uint256[] memory) {
        return _issuerClaimTopics[_issuer];
    }

    function hasClaimTopic(address _issuer, uint256 _claimTopic) external view override returns (bool) {
        return _hasClaimTopic[_issuer][_claimTopic];
    }

    function getTrustedIssuersCount() external view returns (uint256) {
        return _trustedIssuers.length;
    }
}