# verify-cronos.ps1

$apiKey = "msQhXhA0pEiokwzkGalQdqzYKY5KIC38"

# Get the build-info JSON file
$buildInfoDir = "artifacts/build-info"
$jsonFile = Get-ChildItem -Path $buildInfoDir -Filter "*.json" | Select-Object -First 1
Write-Host "Loading build info from: $($jsonFile.FullName)"

$buildInfoRaw = Get-Content $jsonFile.FullName -Raw
$buildInfo = $buildInfoRaw | ConvertFrom-Json

# Build standard JSON input
$sourceCodeObj = @{
    language = $buildInfo.input.language
    sources = $buildInfo.input.sources
    settings = $buildInfo.input.settings
}
$sourceCode = $sourceCodeObj | ConvertTo-Json -Depth 100 -Compress

$compilerVersion = "v$($buildInfo.solcLongVersion)"
Write-Host "Compiler: $compilerVersion"
Write-Host "Source code size: $($sourceCode.Length) bytes"

# Contracts to verify
$contracts = @(
    @{ name = "RWASecurityToken"; address = "0x39506Cae78E2cD85b6c0762EdA86A43abe3D0182"; path = "contracts/core/RWASecurityToken.sol" },
    @{ name = "RWAEscrowVault"; address = "0xE9DA0F79BC40e1c111de49498b3Fb17dCE59b7f2"; path = "contracts/core/RWAEscrowVault.sol" },
    @{ name = "ModularCompliance"; address = "0x2F57462EA95C7b7D381f6Df86204732C93149187"; path = "contracts/compliance/ModularCompliance.sol" },
    @{ name = "RWAProjectNFT"; address = "0x22005206f3FeC3A12Eb507591De8f201e0807b5d"; path = "contracts/core/RWAProjectNFT.sol" },
    @{ name = "OffChainInvestmentManager"; address = "0x4eF437b70cA3035e8aE825348BD90102990d9329"; path = "contracts/OffChainInvestmentManager.sol" },
    @{ name = "RWASecurityExchange"; address = "0x01395d6ac65868A48eE2Df3DB41e2Fd4d4387B5D"; path = "contracts/RWASecurityExchange.sol" },
    @{ name = "DividendDistributor"; address = "0x265BAB421f61EF6F0A0ab28229BAeDa86381f1b0"; path = "contracts/core/DividendDistributor.sol" },
    @{ name = "MaxBalanceModule"; address = "0x175b5Fa6eb9b0331a2dd45820020D05617BA0AE3"; path = "contracts/compliance/modules/MaxBalanceModule.sol" },
    @{ name = "LockupModule"; address = "0x07bf2B1e5900B967175C5927bfA01E30Eb06ab87"; path = "contracts/compliance/modules/LockupModule.sol" },
    @{ name = "RWATradeEscrow"; address = "0xFDf4433F2C053dEAb4f9eb9aa805a6350785EDcb"; path = "contracts/tokenize/RWATradeEscrow.sol" },
    @{ name = "KYCVerifier"; address = "0xe57d2BA10a92eb04eD1B56Cb2dE9D67799782835"; path = "contracts/KYCVerifier.sol" },
    @{ name = "RWALaunchpadFactory"; address = "0xEcD5F2772fF19089f46f1542A07736dfeD9D17e7"; path = "contracts/core/RWALaunchpadFactory.sol" },
    @{ name = "CountryRestrictModule"; address = "0xCE42B1F13e1B5311Ad6c2Cf75D5351385e91f914"; path = "contracts/compliance/modules/CountryRestrictModule.sol" },
    @{ name = "AccreditedInvestorModule"; address = "0x609915eCcf8C784f021ef49F4568d51132185D77"; path = "contracts/compliance/modules/AccreditedInvestorModule.sol" },
    @{ name = "RWATokenizationFactory"; address = "0x3D58fFF590d1E925fd0f510e96C20bc12691840F"; path = "contracts/tokenize/RWATokenizationFactory.sol" }
)

$verified = 0
$failed = 0
$guids = @()

Write-Host "`n======================================================================"
Write-Host "  CRONOS TESTNET CONTRACT VERIFICATION"
Write-Host "======================================================================`n"

foreach ($contract in $contracts) {
    $contractName = "$($contract.path):$($contract.name)"
    Write-Host "Verifying $($contract.name) at $($contract.address)..."
    
    $body = @{
        module = "contract"
        action = "verifysourcecode"
        contractname = $contractName
        contractaddress = $contract.address
        compilerversion = $compilerVersion
        constructorArguments = ""
        codeformat = "solidity-standard-json-input"
        sourceCode = $sourceCode
    }
    
    try {
        $response = Invoke-RestMethod -Uri "https://explorer-api.cronos.org/testnet/api/v2?apikey=$apiKey" -Method Post -Body $body -ContentType "application/x-www-form-urlencoded" -TimeoutSec 120
        
        if ($response.status -eq "1" -and $response.message -eq "OK") {
            Write-Host "  ✅ Submitted! GUID: $($response.result)" -ForegroundColor Green
            $guids += @{ name = $contract.name; guid = $response.result }
            $verified++
        } else {
            Write-Host "  ⚠️  $($response.message): $($response.result)" -ForegroundColor Yellow
            $failed++
        }
    }
    catch {
        $errorMsg = $_.Exception.Message
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Host "  ❌ Error: $errorBody" -ForegroundColor Red
        } else {
            Write-Host "  ❌ Error: $errorMsg" -ForegroundColor Red
        }
        $failed++
    }
    
    # Rate limiting
    Start-Sleep -Seconds 5
}

Write-Host "`n======================================================================"
Write-Host "  SUBMISSION SUMMARY: $verified/$($contracts.Count) submitted"
Write-Host "======================================================================`n"

# Check verification status
if ($guids.Count -gt 0) {
    Write-Host "Waiting 30 seconds before checking status...`n"
    Start-Sleep -Seconds 30
    
    Write-Host "======================================================================"
    Write-Host "  CHECKING VERIFICATION STATUS"
    Write-Host "======================================================================`n"
    
    foreach ($item in $guids) {
        try {
            $statusUrl = "https://explorer-api.cronos.org/testnet/api/v2?apikey=$apiKey&module=contract&action=checkverifystatus&guid=$($item.guid)"
            $statusResponse = Invoke-RestMethod -Uri $statusUrl -Method Get -TimeoutSec 30
            
            if ($statusResponse.status -eq "1") {
                Write-Host "  ✅ $($item.name): Verified!" -ForegroundColor Green
            } elseif ($statusResponse.result -eq "Pending in queue") {
                Write-Host "  ⏳ $($item.name): Pending..." -ForegroundColor Yellow
            } else {
                Write-Host "  ❌ $($item.name): $($statusResponse.result)" -ForegroundColor Red
            }
        }
        catch {
            Write-Host "  ⚠️  $($item.name): Status check failed" -ForegroundColor Yellow
        }
        
        Start-Sleep -Seconds 2
    }
}

Write-Host "`n======================================================================"
Write-Host "  VERIFICATION COMPLETE"
Write-Host "======================================================================"
