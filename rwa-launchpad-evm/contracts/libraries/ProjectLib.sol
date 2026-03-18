// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "./Constants.sol";

library ProjectLib {

    struct MilestoneInput {
        string description;
        uint256 percentageAllocation;
        uint256 deadline;
    }

    error InvalidFundingGoal();
    error InvalidInvestmentLimits();
    error InvalidDeadline();
    error MilestonesSumInvalid();
    error MilestoneDeadlineInvalid();

    function validateProjectParams(uint256 _fundingGoal, uint256 _minInvestment, uint256 _maxInvestment, uint256 _deadline) internal view {
        if (_fundingGoal < Constants.MIN_FUNDING_GOAL) {revert InvalidFundingGoal();}
        if (_minInvestment < Constants.MIN_INVESTMENT || _minInvestment > _maxInvestment) {revert InvalidInvestmentLimits();}
        if (_maxInvestment > _fundingGoal) {revert InvalidInvestmentLimits();}    
        if (_deadline < block.timestamp + Constants.MIN_FUNDRAISE_DURATION) {revert InvalidDeadline();}
    }

    function validateMilestones(MilestoneInput[] calldata _milestones) internal pure {
        uint256 totalPercentage;
        uint256 lastDeadline;
        
        for (uint256 i = 0; i < _milestones.length; i++) {
            totalPercentage += _milestones[i].percentageAllocation;
            if (_milestones[i].deadline <= lastDeadline) {revert MilestoneDeadlineInvalid();}
            lastDeadline = _milestones[i].deadline;
        }
        if (totalPercentage != Constants.BPS_DENOMINATOR) {revert MilestonesSumInvalid();}
    }

    function calculateFee(uint256 _amount, uint256 _feeBps) internal pure returns (uint256) {return (_amount * _feeBps) / Constants.BPS_DENOMINATOR;}
    function amountAfterFee(uint256 _amount, uint256 _feeBps) internal pure returns (uint256) {return _amount - calculateFee(_amount, _feeBps);}
}