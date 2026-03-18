import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

export async function deployFullInfrastructure(owner: SignerWithAddress) {
  // Deploy ClaimTopicsRegistry - needs owner address
  const ClaimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry");
  const claimTopicsRegistry = await upgrades.deployProxy(ClaimTopicsRegistry, [owner.address]);
  await claimTopicsRegistry.waitForDeployment();

  // Deploy TrustedIssuersRegistry - needs owner address
  const TrustedIssuersRegistry = await ethers.getContractFactory("TrustedIssuersRegistry");
  const trustedIssuersRegistry = await upgrades.deployProxy(TrustedIssuersRegistry, [owner.address]);
  await trustedIssuersRegistry.waitForDeployment();

  // Deploy IdentityRegistryStorage - needs owner address
  const IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage");
  const identityStorage = await upgrades.deployProxy(IdentityRegistryStorage, [owner.address]);
  await identityStorage.waitForDeployment();

  // Deploy IdentityRegistry
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await upgrades.deployProxy(IdentityRegistry, [
    owner.address,
    await trustedIssuersRegistry.getAddress(),
    await claimTopicsRegistry.getAddress(),
    await identityStorage.getAddress()
  ]);
  await identityRegistry.waitForDeployment();

  await identityStorage.bindIdentityRegistry(await identityRegistry.getAddress());

  // Deploy MockClaimIssuer
  const MockClaimIssuer = await ethers.getContractFactory("MockClaimIssuer");
  const mockClaimIssuer = await MockClaimIssuer.deploy(owner.address);
  await mockClaimIssuer.waitForDeployment();

  // Setup claim topics
  await claimTopicsRegistry.addClaimTopic(1);
  await trustedIssuersRegistry.addTrustedIssuer(await mockClaimIssuer.getAddress(), [1]);

  // Deploy ModularCompliance - needs owner address
  const ModularCompliance = await ethers.getContractFactory("ModularCompliance");
  const compliance = await upgrades.deployProxy(ModularCompliance, [owner.address]);
  await compliance.waitForDeployment();

  // Deploy RWAProjectNFT - needs owner address
  const RWAProjectNFT = await ethers.getContractFactory("RWAProjectNFT");
  const projectNFT = await upgrades.deployProxy(RWAProjectNFT, [owner.address]);
  await projectNFT.waitForDeployment();

  return {
    claimTopicsRegistry,
    trustedIssuersRegistry,
    identityStorage,
    identityRegistry,
    mockClaimIssuer,
    compliance,
    projectNFT
  };
}

export async function setupInvestorIdentity(
  investorAddress: string,
  countryCode: number,
  identityRegistry: any,
  mockClaimIssuer: any
) {
  const MockIdentity = await ethers.getContractFactory("MockIdentity");
  const identity = await MockIdentity.deploy(investorAddress);
  await identity.waitForDeployment();

  const claimData = ethers.AbiCoder.defaultAbiCoder().encode(["bool"], [true]);
  await identity.addClaim(1, 1, await mockClaimIssuer.getAddress(), "0x", claimData, "");

  await identityRegistry.registerIdentity(investorAddress, await identity.getAddress(), countryCode);
  return identity;
}
