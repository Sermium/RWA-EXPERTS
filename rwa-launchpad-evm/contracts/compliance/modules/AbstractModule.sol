// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "../../interfaces/IModule.sol";
import "../../interfaces/IModularCompliance.sol";

abstract contract AbstractModule is IModule {
    mapping(address => bool) internal _complianceBound;

    error ComplianceNotBound();
    error ComplianceAlreadyBound();
    error ZeroAddress();
    error Unauthorized();

    modifier onlyBoundCompliance(address _compliance) {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        _;
    }

    function bindCompliance(address _compliance) external virtual override {
        if (_compliance == address(0)) revert ZeroAddress();
        if (_complianceBound[_compliance]) revert ComplianceAlreadyBound();
        _complianceBound[_compliance] = true;
        emit ComplianceBound(_compliance);
    }

    function unbindCompliance(address _compliance) external virtual override {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        _complianceBound[_compliance] = false;
        emit ComplianceUnbound(_compliance);
    }

    function isComplianceBound(address _compliance) external view override returns (bool) {
        return _complianceBound[_compliance];
    }

    function moduleCheck(address _from, address _to, uint256 _value, address _compliance) external view virtual override returns (bool);
    function moduleMintAction(address _to, uint256 _value, address _compliance) external virtual override;
    function moduleBurnAction(address _from, uint256 _value, address _compliance) external virtual override;
    function moduleTransferAction(address _from, address _to, uint256 _value, address _compliance) external virtual override;
    function name() external pure virtual override returns (string memory);
}