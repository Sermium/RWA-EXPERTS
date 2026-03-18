// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract ProjectBadgeManager is AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant BADGE_ADMIN_ROLE = keccak256("BADGE_ADMIN_ROLE");
    enum BadgeType { Wildcard, Verified, Sponsored }
    enum BadgeColor { Bronze, Silver, Gold }
    struct Badge { BadgeType badgeType; BadgeColor color; uint256 grantedAt; }
    mapping(uint256 => Badge) public projectBadges;
    event BadgeUpdated(uint256 indexed projectId, BadgeType badgeType, BadgeColor color);

    function initialize(address admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BADGE_ADMIN_ROLE, admin);
    }

    function setBadge(uint256 projectId, BadgeType badgeType, BadgeColor color) external onlyRole(BADGE_ADMIN_ROLE) {
        projectBadges[projectId] = Badge({ badgeType: badgeType, color: color, grantedAt: block.timestamp });
        emit BadgeUpdated(projectId, badgeType, color);
    }

    function getBadge(uint256 projectId) external view returns (Badge memory) {
        Badge memory badge = projectBadges[projectId];
        if (badge.grantedAt == 0) { return Badge(BadgeType.Wildcard, BadgeColor.Bronze, 0); }
        return badge;
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}