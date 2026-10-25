// @vitest-environment node
/**
 * Milestones are defined in the database and the escrow vault releases amounts: these tests pin
 * how a milestone's release amount and its review status are derived.
 */
import { describe, it, expect } from 'vitest';
import { MILESTONE_STATE, milestoneRef, milestoneReleaseAmount, toReviewMilestone, type ProjectMilestone } from '../vault';

const USD = (n: number) => BigInt(Math.round(n * 1e6));

describe('milestoneReleaseAmount', () => {
  it('pays the milestone its percentage of the budget held at completion', () => {
    // 10,000 held, nothing released yet: 30% is 3,000
    expect(milestoneReleaseAmount(USD(10_000), USD(0), 30, false)).toBe(USD(3_000));
    // after 3,000 was released the budget is still 10,000: the next 30% is another 3,000
    expect(milestoneReleaseAmount(USD(7_000), USD(3_000), 30, false)).toBe(USD(3_000));
  });

  it('gives the last unreleased milestone everything left, so rounding strands nothing', () => {
    expect(milestoneReleaseAmount(USD(4_000.000001), USD(6_000), 40, true)).toBe(USD(4_000.000001));
  });

  it('never releases more than the vault still holds', () => {
    expect(milestoneReleaseAmount(USD(500), USD(9_500), 30, false)).toBe(USD(500));
  });

  it('supports fractional percentages', () => {
    expect(milestoneReleaseAmount(USD(10_000), USD(0), 12.5, false)).toBe(USD(1_250));
  });
});

describe('toReviewMilestone', () => {
  const base: ProjectMilestone = {
    index: 0,
    description: 'Permits',
    fundingPercentage: 25,
    amount: USD(2_500),
    deadline: BigInt(0),
    state: MILESTONE_STATE.PENDING,
    proofStatus: null,
    releasedAt: BigInt(0),
    approvedAt: BigInt(0),
    releaseTxHash: null,
  };

  it('maps database states to the review screens', () => {
    expect(toReviewMilestone(base).status).toBe(0); // Pending
    expect(toReviewMilestone({ ...base, proofStatus: 'pending' }).status).toBe(1); // Submitted
    expect(toReviewMilestone({ ...base, state: MILESTONE_STATE.REJECTED, proofStatus: 'rejected' }).status).toBe(3);
    const released = toReviewMilestone({ ...base, state: MILESTONE_STATE.RELEASED, proofStatus: 'approved' });
    expect(released.status).toBe(5);
    expect(released.releasedAmount).toBe(USD(2_500));
    expect(released.percentage).toBe(BigInt(2500)); // basis points
  });

  it('only reports a released amount once released', () => {
    expect(toReviewMilestone(base).releasedAmount).toBe(BigInt(0));
  });
});

describe('milestoneRef', () => {
  it('tags releases with the project and milestone', () => {
    expect(milestoneRef(BigInt(7), 2)).toBe('project-7-milestone-2');
  });
});
