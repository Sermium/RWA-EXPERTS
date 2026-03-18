// scripts/verify-cronos.ts
import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const CRONOS_TESTNET_API = "https://explorer-api.cronos.org/testnet/api/v2";
const API_KEY = process.env.CRONOS_API_KEY || "msQhXhA0pEiokwzkGalQdqzYKY5KIC38";

const contracts = [
  { name: "RWASecurityToken", address: "0x39506Cae78E2cD85b6c0762EdA86A43abe3D0182", path: "contracts/core/RWASecurityToken.sol" },
  { name: "RWAEscrowVault", address: "0xE9DA0F79BC40e1c111de49498b3Fb17dCE59b7f2", path: "contracts/core/RWAEscrowVault.sol" },
  { name: "ModularCompliance", address: "0x2F57462EA95C7b7D381f6Df86204732C93149187", path: "contracts/compliance/ModularCompliance.sol" },
  { name: "RWAProjectNFT", address: "0x22005206f3FeC3A12Eb507591De8f201e0807b5d", path: "contracts/core/RWAProjectNFT.sol" },
  { name: "OffChainInvestmentManager", address: "0x4eF437b70cA3035e8aE825348BD90102990d9329", path: "contracts/OffChainInvestmentManager.sol" },
  { name: "RWASecurityExchange", address: "0x01395d6ac65868A48eE2Df3DB41e2Fd4d4387B5D", path: "contracts/RWASecurityExchange.sol" },
  { name: "DividendDistributor", address: "0x265BAB421f61EF6F0A0ab28229BAeDa86381f1b0", path: "contracts/core/DividendDistributor.sol" },
  { name: "MaxBalanceModule", address: "0x175b5Fa6eb9b0331a2dd45820020D05617BA0AE3", path: "contracts/compliance/modules/MaxBalanceModule.sol" },
  { name: "LockupModule", address: "0x07bf2B1e5900B967175C5927bfA01E30Eb06ab87", path: "contracts/compliance/modules/LockupModule.sol" },
  { name: "RWATradeEscrow", address: "0xFDf4433F2C053dEAb4f9eb9aa805a6350785EDcb", path: "contracts/tokenize/RWATradeEscrow.sol" },
  { name: "KYCVerifier", address: "0xe57d2BA10a92eb04eD1B56Cb2dE9D67799782835", path: "contracts/KYCVerifier.sol" },
  { name: "RWALaunchpadFactory", address: "0xEcD5F2772fF19089f46f1542A07736dfeD9D17e7", path: "contracts/core/RWALaunchpadFactory.sol" },
  { name: "CountryRestrictModule", address: "0xCE42B1F13e1B5311Ad6c2Cf75D5351385e91f914", path: "contracts/compliance/modules/CountryRestrictModule.sol" },
  { name: "AccreditedInvestorModule", address: "0x609915eCcf8C784f021ef49F4568d51132185D77", path: "contracts/compliance/modules/AccreditedInvestorModule.sol" },
  { name: "RWATokenizationFactory", address: "0x3D58fFF590d1E925fd0f510e96C20bc12691840F", path: "contracts/tokenize/RWATokenizationFactory.sol" },
];

function getBuildInfo() {
  const buildInfoDir = path.join(__dirname, "../artifacts/build-info");
  const files = fs.readdirSync(buildInfoDir);
  const jsonFile = files.find(f => f.endsWith(".json"));
  if (!jsonFile) throw new Error("No build-info JSON found");
  const content = fs.readFileSync(path.join(buildInfoDir, jsonFile), "utf-8");
  return JSON.parse(content);
}

function postRequest(url: string, data: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(data),
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function verifyContract(contract: { name: string; address: string; path: string }) {
  console.log(`\n🔍 Verifying ${contract.name} at ${contract.address}...`);

  try {
    const buildInfo = getBuildInfo();

    const sourceCode = JSON.stringify({
      language: buildInfo.input.language,
      sources: buildInfo.input.sources,
      settings: buildInfo.input.settings,
    });

    const contractName = `${contract.path}:${contract.name}`;
    const compilerVersion = `v${buildInfo.solcLongVersion}`;

    const params = new URLSearchParams({
      module: "contract",
      action: "verifysourcecode",
      contractname: contractName,
      contractaddress: contract.address,
      compilerversion: compilerVersion,
      constructorArguments: "",
      codeformat: "solidity-standard-json-input",
      sourceCode: sourceCode,
    });

    const url = `${CRONOS_TESTNET_API}?apikey=${API_KEY}`;
    console.log(`   Contract: ${contractName}`);
    console.log(`   Compiler: ${compilerVersion}`);

    const response = await postRequest(url, params.toString());

    console.log(`   HTTP ${response.status}:`, JSON.stringify(response.data).substring(0, 200));

    if (response.data.status === "1" && response.data.message === "OK") {
      console.log(`   ✅ Submitted! GUID: ${response.data.result}`);
      return { success: true, guid: response.data.result };
    } else {
      console.log(`   ⚠️  ${response.data.message}: ${response.data.result}`);
      return { success: false, guid: null };
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, guid: null };
  }
}

async function main() {
  console.log("=".repeat(70));
  console.log("  CRONOS TESTNET CONTRACT VERIFICATION (Native HTTPS)");
  console.log("=".repeat(70));

  let verified = 0;

  for (const contract of contracts) {
    const result = await verifyContract(contract);
    if (result.success) verified++;
    await new Promise((r) => setTimeout(r, 5000)); // 5s delay
  }

  console.log("\n" + "=".repeat(70));
  console.log(`  SUMMARY: ${verified}/${contracts.length} submitted`);
  console.log("=".repeat(70));
}

main().catch(console.error);
