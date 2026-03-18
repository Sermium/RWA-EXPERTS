import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

// ============ Time Utilities ============

export async function increaseTime(seconds: number | bigint): Promise<void> {
    await time.increase(Number(seconds));
}

export async function getBlockTimestamp(): Promise<number> {
    return await time.latest();
}

export async function mineBlocks(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
        await ethers.provider.send("evm_mine", []);
    }
}

export async function setNextBlockTimestamp(timestamp: number): Promise<void> {
    await time.setNextBlockTimestamp(timestamp);
}

export async function getFutureTimestamp(daysFromNow: number): Promise<number> {
    const latest = await time.latest();
    return latest + (daysFromNow * 24 * 60 * 60);
}

// ============ Fee Calculations ============

export function calculateFee(amount: bigint, feeBps: bigint): bigint {
    return (amount * feeBps) / 10000n;
}

export function amountAfterFee(amount: bigint, feeBps: bigint): bigint {
    const fee = calculateFee(amount, feeBps);
    return amount - fee;
}

// ============ Formatting ============

export function parseEther(value: string | number): bigint {
    return ethers.parseEther(value.toString());
}

export function formatEther(value: bigint): string {
    return ethers.formatEther(value);
}

export function parseUnits(value: string | number, decimals: number = 18): bigint {
    return ethers.parseUnits(value.toString(), decimals);
}

export function formatUnits(value: bigint, decimals: number = 18): string {
    return ethers.formatUnits(value, decimals);
}

// ============ Role Helpers ============

export function getRoleHash(roleName: string): string {
    return ethers.id(roleName);
}

// ============ Signature Helpers ============

export async function createClaimSignature(
    signer: any,
    identity: string,
    topic: bigint,
    data: string
): Promise<string> {
    const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "bytes"],
        [identity, topic, data]
    );
    return await signer.signMessage(ethers.getBytes(messageHash));
}

// ============ Snapshot Helper ============

export class SnapshotHelper {
    private snapshotId: string | null = null;

    async take(): Promise<string> {
        this.snapshotId = await ethers.provider.send("evm_snapshot", []);
        return this.snapshotId;
    }

    async restore(): Promise<void> {
        if (this.snapshotId) {
            await ethers.provider.send("evm_revert", [this.snapshotId]);
            // Take a new snapshot for potential future restores
            this.snapshotId = await ethers.provider.send("evm_snapshot", []);
        }
    }
}

// ============ Address Helpers ============

export function isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
}

export const ZERO_ADDRESS = ethers.ZeroAddress;

// ============ Bytes Helpers ============

export function toBytes32(value: string): string {
    return ethers.zeroPadValue(ethers.toUtf8Bytes(value), 32);
}

export function keccak256(value: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(value));
}
