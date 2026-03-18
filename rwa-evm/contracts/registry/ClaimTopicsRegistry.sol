// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IClaimTopicsRegistry.sol";
import "../libraries/Constants.sol";

contract ClaimTopicsRegistry is Initializable, UUPSUpgradeable, OwnableUpgradeable, IClaimTopicsRegistry {
    uint256[] private _claimTopics;
    mapping(uint256 => uint256) private _topicIndex;

    event ClaimTopicAdded(uint256 indexed claimTopic);
    event ClaimTopicRemoved(uint256 indexed claimTopic);

    error TopicAlreadyExists();
    error TopicNotFound();
    error TooManyTopics();
    error InvalidAddress();

    function initialize(address _owner) external initializer {
        if (_owner == address(0)) revert InvalidAddress();
        __Ownable_init();
        transferOwnership(_owner);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function addClaimTopic(uint256 _claimTopic) external override onlyOwner {
        if (_topicIndex[_claimTopic] != 0) revert TopicAlreadyExists();
        if (_claimTopics.length >= Constants.MAX_CLAIM_TOPICS) revert TooManyTopics();

        _claimTopics.push(_claimTopic);
        _topicIndex[_claimTopic] = _claimTopics.length;

        emit ClaimTopicAdded(_claimTopic);
    }

    function removeClaimTopic(uint256 _claimTopic) external override onlyOwner {
        uint256 indexPlusOne = _topicIndex[_claimTopic];
        if (indexPlusOne == 0) revert TopicNotFound();

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = _claimTopics.length - 1;

        if (index != lastIndex) {
            uint256 lastTopic = _claimTopics[lastIndex];
            _claimTopics[index] = lastTopic;
            _topicIndex[lastTopic] = indexPlusOne;
        }

        _claimTopics.pop();
        delete _topicIndex[_claimTopic];

        emit ClaimTopicRemoved(_claimTopic);
    }

    function getClaimTopics() external view override returns (uint256[] memory) { return _claimTopics; }
    function getClaimTopicsCount() external view returns (uint256) { return _claimTopics.length; }
    function containsTopic(uint256 _topic) external view returns (bool) { return _topicIndex[_topic] != 0; }
}