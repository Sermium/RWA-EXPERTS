import hre, { ethers } from "hardhat";

/**
 * Zero the given state variables of a proxy, to put a freshly deployed contract into the state an
 * upgraded v1 proxy is in (v2 variables are appended, so they read as zero after the upgrade).
 * Only works for variables that each fill their own slot, or share it only with other zeroed ones.
 */
export async function zeroStateVariables(proxyAddress: string, contractFqn: string, labels: string[]) {
  for (const label of labels) {
    await setSlot(proxyAddress, await slotOf(contractFqn, label));
  }
}

/** Zero `label[key1][key2]...` of a (nested) mapping keyed by addresses or uint256s */
export async function zeroMappingEntry(proxyAddress: string, contractFqn: string, label: string, ...keys: Array<string | bigint>) {
  let slot = await slotOf(contractFqn, label);
  for (const key of keys) {
    const keyType = typeof key === "string" ? "address" : "uint256";
    slot = BigInt(ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode([keyType, "uint256"], [key, slot])));
  }
  await setSlot(proxyAddress, slot);
}

async function slotOf(contractFqn: string, label: string): Promise<bigint> {
  const buildInfo = await hre.artifacts.getBuildInfo(contractFqn);
  if (!buildInfo) throw new Error(`no build info for ${contractFqn}`);
  const [source, name] = contractFqn.split(":");
  const layout = (buildInfo.output.contracts[source][name] as any).storageLayout.storage as Array<{
    label: string;
    slot: string;
  }>;
  const entry = layout.find((e) => e.label === label);
  if (!entry) throw new Error(`no state variable ${label} in ${contractFqn}`);
  return BigInt(entry.slot);
}

async function setSlot(address: string, slot: bigint) {
  await ethers.provider.send("hardhat_setStorageAt", [address, ethers.toQuantity(slot), ethers.ZeroHash]);
}
