import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

export const US = 840;
export const IRAN = 364;

export interface KYCProof {
  level: number;
  countryCode: number;
  expiry: bigint;
  signature: string;
}

export async function deployKYCVerifier(trustedSigner: string, feeRecipient: string, fee = 0n) {
  const KYCVerifier = await ethers.getContractFactory("KYCVerifier");
  return upgrades.deployProxy(KYCVerifier, [trustedSigner, fee, feeRecipient], { kind: "uups" });
}

/** EIP-712 signature over KYCProof(address wallet,uint8 level,uint16 countryCode,uint256 expiry) */
export async function signKYC(
  signer: SignerWithAddress,
  verifierAddress: string,
  wallet: string,
  level: number,
  countryCode: number,
  expiry: bigint
): Promise<string> {
  const { chainId } = await ethers.provider.getNetwork();
  return signer.signTypedData(
    { name: "RWA KYC Verifier", version: "1", chainId, verifyingContract: verifierAddress },
    {
      KYCProof: [
        { name: "wallet", type: "address" },
        { name: "level", type: "uint8" },
        { name: "countryCode", type: "uint16" },
        { name: "expiry", type: "uint256" },
      ],
    },
    { wallet, level, countryCode, expiry }
  );
}

/** A proof valid for a year from the current block time */
export async function kycProof(
  signer: SignerWithAddress,
  verifier: { getAddress(): Promise<string> },
  wallet: string,
  level = 1,
  countryCode = US
): Promise<KYCProof> {
  const expiry = BigInt(await time.latest()) + 365n * 24n * 3600n;
  const signature = await signKYC(signer, await verifier.getAddress(), wallet, level, countryCode, expiry);
  return { level, countryCode, expiry, signature };
}

/** Cache a fresh KYC proof for each wallet on a security token */
export async function cacheKYC(
  token: any,
  signer: SignerWithAddress,
  verifier: { getAddress(): Promise<string> },
  wallets: string[],
  level = 1,
  countryCode = US
) {
  for (const wallet of wallets) {
    await token.cacheKYC(wallet, await kycProof(signer, verifier, wallet, level, countryCode));
  }
}

/** RWASecurityToken proxy with its own ModularCompliance (owned by `admin`) and a counting module */
export async function deploySecurityToken(admin: SignerWithAddress, verifier: any, maxSupply = ethers.parseEther("1000000")) {
  const ModularCompliance = await ethers.getContractFactory("ModularCompliance");
  const compliance: any = await upgrades.deployProxy(ModularCompliance, [admin.address], { kind: "uups" });

  const RWASecurityToken = await ethers.getContractFactory("RWASecurityToken");
  const token: any = await upgrades.deployProxy(
    RWASecurityToken,
    ["Test Security", "TSEC", admin.address, await compliance.getAddress(), await verifier.getAddress(), maxSupply],
    { kind: "uups" }
  );
  await compliance.connect(admin).bindToken(await token.getAddress());

  const module: any = await (await ethers.getContractFactory("MockComplianceModule")).deploy();
  await compliance.connect(admin).addModule(await module.getAddress());

  return { token, compliance, module };
}
