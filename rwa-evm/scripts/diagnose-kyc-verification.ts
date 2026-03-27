import { ethers } from "hardhat";

const KYC_VERIFIER = "0x3CA5b7e66cF25E8C761aA07f318e06B83d0bde7B";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("           KYC VERIFIER SIGNATURE DIAGNOSTIC");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const kycVerifier = await ethers.getContractAt("KYCVerifier", KYC_VERIFIER);

  // Get all function names to understand the contract
  const factory = await ethers.getContractFactory("KYCVerifier");
  console.log("=== KYCVerifier Functions ===");
  factory.interface.fragments
    .filter(f => f.type === 'function')
    .forEach(f => {
      const fn = f as ethers.FunctionFragment;
      const inputs = fn.inputs.map(i => `${i.type} ${i.name}`).join(", ");
      console.log(`  ${fn.name}(${inputs})`);
    });

  // Get current state
  console.log("\n=== Current State ===");
  const trustedSigner = await kycVerifier.trustedSigner();
  console.log(`Trusted Signer: ${trustedSigner}`);
  console.log(`Deployer Address: ${deployer.address}`);
  console.log(`Deployer is Trusted Signer: ${trustedSigner.toLowerCase() === deployer.address.toLowerCase()}`);

  // Check if there's a domain separator (EIP-712)
  console.log("\n=== Checking EIP-712 Components ===");
  try {
    const domainSeparator = await kycVerifier.DOMAIN_SEPARATOR();
    console.log(`DOMAIN_SEPARATOR: ${domainSeparator}`);
  } catch (e) {
    console.log("No DOMAIN_SEPARATOR function (not using EIP-712)");
  }

  try {
    const domainSeparator = await kycVerifier.domainSeparator();
    console.log(`domainSeparator(): ${domainSeparator}`);
  } catch (e) {
    console.log("No domainSeparator() function");
  }

  // Test parameters
  const wallet = deployer.address;
  const level = 3;
  const countryCode = 840;
  const expiry = Math.floor(Date.now() / 1000) + 86400; // 24 hours

  console.log("\n=== Test Parameters ===");
  console.log(`Wallet: ${wallet}`);
  console.log(`Level: ${level}`);
  console.log(`Country Code: ${countryCode}`);
  console.log(`Expiry: ${expiry} (${new Date(expiry * 1000).toISOString()})`);

  // Try different signature approaches
  console.log("\n=== Testing Different Signature Formats ===");

  // Approach 1: Simple packed encoding (personal_sign prefix)
  console.log("\n1. signMessage with packed encoding (abi.encodePacked equivalent):");
  try {
    const messageHash1 = ethers.solidityPackedKeccak256(
      ["address", "uint8", "uint16", "uint256"],
      [wallet, level, countryCode, expiry]
    );
    console.log(`   Message Hash: ${messageHash1}`);
    
    // signMessage adds the Ethereum prefix automatically
    const signature1 = await deployer.signMessage(ethers.getBytes(messageHash1));
    console.log(`   Signature: ${signature1}`);

    // Verify
    const kycProof1 = {
      wallet,
      level,
      countryCode,
      expiry,
      signature: signature1
    };
    
    const isValid1 = await kycVerifier.verifyKYCProof(kycProof1);
    console.log(`   Verification Result: ${isValid1}`);
  } catch (e: any) {
    console.log(`   Error: ${e.message}`);
  }

  // Approach 2: Raw signature without prefix
  console.log("\n2. Raw signature (no prefix):");
  try {
    const messageHash2 = ethers.solidityPackedKeccak256(
      ["address", "uint8", "uint16", "uint256"],
      [wallet, level, countryCode, expiry]
    );
    
    // Use signMessage which adds prefix - this is what contracts usually expect
    const signingKey = new ethers.SigningKey(
      (deployer as any).privateKey || 
      // If no direct access, we can't do raw signing
      (() => { throw new Error("Cannot access private key for raw signing"); })()
    );
    const sig2 = signingKey.sign(messageHash2);
    const signature2 = ethers.Signature.from(sig2).serialized;
    console.log(`   Signature: ${signature2}`);

    const kycProof2 = { wallet, level, countryCode, expiry, signature: signature2 };
    const isValid2 = await kycVerifier.verifyKYCProof(kycProof2);
    console.log(`   Verification Result: ${isValid2}`);
  } catch (e: any) {
    console.log(`   Cannot test raw signing: ${e.message}`);
  }

  // Approach 3: Different type encodings
  console.log("\n3. Testing different type combinations:");
  
  const typeVariations = [
    { types: ["address", "uint8", "uint16", "uint256"], desc: "uint8/uint16/uint256" },
    { types: ["address", "uint256", "uint256", "uint256"], desc: "all uint256" },
    { types: ["address", "uint8", "uint256", "uint256"], desc: "uint8 level, uint256 country" },
    { types: ["address", "uint256", "uint16", "uint256"], desc: "uint256 level, uint16 country" },
  ];

  for (const variation of typeVariations) {
    try {
      const messageHash = ethers.solidityPackedKeccak256(
        variation.types as any,
        [wallet, level, countryCode, expiry]
      );
      const signature = await deployer.signMessage(ethers.getBytes(messageHash));
      const kycProof = { wallet, level, countryCode, expiry, signature };
      const isValid = await kycVerifier.verifyKYCProof(kycProof);
      console.log(`   ${variation.desc}: ${isValid ? '✓ VALID' : '✗ Invalid'}`);
      
      if (isValid) {
        console.log(`   >>> FOUND CORRECT FORMAT: ${variation.types.join(", ")}`);
        console.log(`   >>> Message Hash: ${messageHash}`);
        console.log(`   >>> Signature: ${signature}`);
      }
    } catch (e: any) {
      console.log(`   ${variation.desc}: Error - ${e.message.substring(0, 50)}`);
    }
  }

  // Approach 4: Check for EIP-712 typed data
  console.log("\n4. Testing EIP-712 typed data signature:");
  try {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    
    const domain = {
      name: "KYCVerifier",
      version: "1",
      chainId: chainId,
      verifyingContract: KYC_VERIFIER
    };

    const types = {
      KYCProof: [
        { name: "wallet", type: "address" },
        { name: "level", type: "uint8" },
        { name: "countryCode", type: "uint16" },
        { name: "expiry", type: "uint256" }
      ]
    };

    const value = { wallet, level, countryCode, expiry };

    const signature = await deployer.signTypedData(domain, types, value);
    console.log(`   Signature: ${signature}`);

    const kycProof = { wallet, level, countryCode, expiry, signature };
    const isValid = await kycVerifier.verifyKYCProof(kycProof);
    console.log(`   Verification Result: ${isValid}`);
    
    if (isValid) {
      console.log("   >>> EIP-712 FORMAT IS CORRECT!");
    }
  } catch (e: any) {
    console.log(`   Error: ${e.message}`);
  }

  // Approach 5: Check alternate domain names
  console.log("\n5. Testing different EIP-712 domain names:");
  const domainNames = ["KYCVerifier", "RWA KYC", "RWAKYCVerifier", "KYC"];
  
  for (const domainName of domainNames) {
    try {
      const chainId = (await ethers.provider.getNetwork()).chainId;
      
      const domain = {
        name: domainName,
        version: "1",
        chainId: chainId,
        verifyingContract: KYC_VERIFIER
      };

      const types = {
        KYCProof: [
          { name: "wallet", type: "address" },
          { name: "level", type: "uint8" },
          { name: "countryCode", type: "uint16" },
          { name: "expiry", type: "uint256" }
        ]
      };

      const value = { wallet, level, countryCode, expiry };
      const signature = await deployer.signTypedData(domain, types, value);
      const kycProof = { wallet, level, countryCode, expiry, signature };
      const isValid = await kycVerifier.verifyKYCProof(kycProof);
      
      console.log(`   Domain "${domainName}": ${isValid ? '✓ VALID' : '✗ Invalid'}`);
      
      if (isValid) {
        console.log(`   >>> FOUND CORRECT DOMAIN: "${domainName}"`);
      }
    } catch (e: any) {
      console.log(`   Domain "${domainName}": Error`);
    }
  }

  // Check what the contract expects
  console.log("\n=== Checking Contract's Expected Format ===");
  
  // Look for any helper functions
  const helperFunctions = [
    'getMessageHash',
    'hashKYCProof', 
    '_hashKYCProof',
    'getKYCHash',
    'computeHash',
    'MESSAGE_TYPEHASH',
    'KYCPROOF_TYPEHASH'
  ];

  for (const funcName of helperFunctions) {
    try {
      const func = (kycVerifier as any)[funcName];
      if (typeof func === 'function') {
        if (funcName.includes('TYPEHASH')) {
          const hash = await func();
          console.log(`${funcName}: ${hash}`);
        } else {
          // Try calling with our params
          const result = await func(wallet, level, countryCode, expiry);
          console.log(`${funcName}(...): ${result}`);
        }
      }
    } catch (e) {
      // Function doesn't exist or has different signature
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("Please share your KYCVerifier.sol contract code to identify");
  console.log("the exact signature format expected.");
  console.log("═══════════════════════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
