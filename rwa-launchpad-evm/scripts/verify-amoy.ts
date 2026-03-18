import { run } from "hardhat";

const CONTRACTS = {
  // ========== IMPLEMENTATIONS (no constructor args) ==========
  "SecurityToken Implementation": {
    address: "0x8E3cb291808cd11De2784ad755583c81271d7CB6",
    constructorArgs: [],
  },
  "EscrowVault Implementation": {
    address: "0xDaB11CBCE78B74855bfFe1Ecde32B9E398735E21",
    constructorArgs: [],
  },
  "Compliance Implementation": {
    address: "0xE96EC2CBF6286ecDd4b62652249b4671d759bB6f",
    constructorArgs: [],
  },
  "ProjectNFT Implementation": {
    address: "0x1cBb32106cba839F3B832d0f7E97eBFA478b6C9f",
    constructorArgs: [],
  },
  "KYCManager Implementation": {
    address: "0xd2A1A01A7c09248F799aD3a13b22768aE6a57154",
    constructorArgs: [],
  },
  "OffChainManager Implementation": {
    address: "0xFdfCF4bedd5b2b2F1551Bc5504a52CDb7ECc5827",
    constructorArgs: [],
  },
  "Exchange Implementation": {
    address: "0x663b7b7E2033B379aE36120e9511eFBF9A8280e0",
    constructorArgs: [],
  },
  "DividendDistributor Implementation": {
    address: "0x14B1f263A533b5973A1bC3Bb3DfEB1EcDBf83FDe",
    constructorArgs: [],
  },
  "MaxBalanceModule Implementation": {
    address: "0x1017BAE2fa985cfa9C507C433D9eF9F1b7c1a623",
    constructorArgs: [],
  },
  "LockupModule Implementation": {
    address: "0xE88C3bc8EBa58cbB53F02a546A6d960b266cA9AB",
    constructorArgs: [],
  },
  "RWATradeEscrow Implementation": {
    address: "0xD0F152D827B9Ff649F2b51C2Ce0057B080980691",
    constructorArgs: [],
  },
  "TokenizationFactory Implementation": {
    address: "0x0194e637d64F2367fb229f3168DaB3E8817911CE",
    constructorArgs: [],
  },

  // ========== IDENTITY CONTRACTS ==========
  "IdentityRegistryStorage": {
    address: "0x7E8F717E4797DB78216c94865EF632C838Bb8210",
    constructorArgs: [],
  },
  "ClaimTopicsRegistry": {
    address: "0x91B0842f54e5b665ac0A522028fa689A35297F7f",
    constructorArgs: [],
  },
  "TrustedIssuersRegistry": {
    address: "0x5072Bf6B3175085BFd0E369e88904388e9cD2053",
    constructorArgs: [],
  },
  "CountryRestrictModule": {
    address: "0xB4e54DF18640a5A3e9215e41F804a057D57ef13B",
    constructorArgs: [],
  },
  "AccreditedInvestorModule": {
    address: "0x994Ec9edE136a1553B0043Bb918E9663c473bb6e",
    constructorArgs: [],
  },

  // ========== PROXIES (main contracts) ==========
  "RWAProjectNFT": {
    address: "0xc0a4048dC08a4264f23e6421fE7C39f85893c177",
    constructorArgs: [],
  },
  "RWALaunchpadFactory": {
    address: "0x3526eA23462EEF440830883755FE4c7C2E950D4D",
    constructorArgs: [],
  },
  "KYCManager": {
    address: "0x0f717E38086dE75e91a06A94651C5F9f65Ea46DA",
    constructorArgs: [],
  },
  "RWATokenizationFactory": {
    address: "0x3CFf301e5cBfBD6E477D324C219CEE122af611A4",
    constructorArgs: [],
  },
  "RWATradeEscrow": {
    address: "0xD0F152D827B9Ff649F2b51C2Ce0057B080980691",
    constructorArgs: [],
  },
  "IdentityRegistry": {
    address: "0x9f41B622620194Efe33F3E6ea98491b596A3fbfc",
    constructorArgs: [],
  },
  "RWASecurityExchange": {
    address: "0x9aF6753638516dB3e96A1A2d7841931Bc1Af7730",
    constructorArgs: [],
  },
  "OffChainInvestmentManager": {
    address: "0x5148e1C544a230C5930B41b822C1a20479Bfd1eF",
    constructorArgs: [],
  },
};

async function main() {
  console.log("======================================================");
  console.log("  POLYGON AMOY - CONTRACT VERIFICATION");
  console.log("======================================================\n");

  const results: { name: string; status: string }[] = [];

  for (const [name, config] of Object.entries(CONTRACTS)) {
    console.log(`\n🔍 Verifying: ${name}`);
    console.log(`   Address: ${config.address}`);

    try {
      await run("verify:verify", {
        address: config.address,
        constructorArguments: config.constructorArgs,
      });
      console.log(`   ✅ Verified successfully!`);
      results.push({ name, status: "✅ Success" });
    } catch (error: any) {
      if (error.message.includes("Already Verified") || error.message.includes("already verified")) {
        console.log(`   ⏭️  Already verified`);
        results.push({ name, status: "⏭️ Already verified" });
      } else {
        console.log(`   ❌ Failed: ${error.message.slice(0, 80)}`);
        results.push({ name, status: `❌ Failed` });
      }
    }

    // Rate limit delay (2 seconds between requests)
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Summary
  console.log("\n======================================================");
  console.log("  VERIFICATION SUMMARY");
  console.log("======================================================");
  
  const success = results.filter(r => r.status.includes("✅")).length;
  const alreadyVerified = results.filter(r => r.status.includes("⏭️")).length;
  const failed = results.filter(r => r.status.includes("❌")).length;
  
  console.log(`\n✅ Success: ${success}`);
  console.log(`⏭️  Already verified: ${alreadyVerified}`);
  console.log(`❌ Failed: ${failed}`);
  
  console.log("\nDetails:");
  for (const r of results) {
    console.log(`  ${r.status.padEnd(25)} ${r.name}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
