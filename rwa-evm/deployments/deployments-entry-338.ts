
  // ==========================================================================
  // CRONOS TESTNET - Deployed 2026-02-25
  // KYC System: Off-chain (Supabase) + On-chain signature verification
  // KYC Tiers: Bronze ($20K), Silver ($200K), Gold ($2M), Platinum (Unlimited)
  // ==========================================================================
  338: {
    contracts: {
      KYCVerifier: "0x502e3c88828db1b478c38CD251Bfe861429b9482",
      RWAProjectNFT: "0xC8e4E9B4e2814c7E5295DE8809E7Dc321539fe9e",
      RWALaunchpadFactory: "0x02D074440967709a56E91cDACfdB37f8Ca2843D9",
      RWATokenizationFactory: "0xA79bdd0f2B60F1af34Bf35a9cf05b1e31714961b",
      RWASecurityExchange: "0xd24e102B207f55a7B13F2d269de5ebC2B526A2dF",
      OffChainInvestmentManager: "0x887E74dDf58FF6a0F6DE51e0fe310e5943E13247",
      CountryRestrictModule: "0xAd8B3A07018a4Ca56a85aD9c5731f306Ad9A647D",
      AccreditedInvestorModule: "0x8C3677Dd122f787C4cc7C9a649c7503489505D87",
      Implementations: {
        SecurityToken: "0x39506Cae78E2cD85b6c0762EdA86A43abe3D0182",
        EscrowVault: "0xE9DA0F79BC40e1c111de49498b3Fb17dCE59b7f2",
        Compliance: "0x2F57462EA95C7b7D381f6Df86204732C93149187",
        ProjectNFT: "0x22005206f3FeC3A12Eb507591De8f201e0807b5d",
        OffChainManager: "0x4eF437b70cA3035e8aE825348BD90102990d9329",
        Exchange: "0x01395d6ac65868A48eE2Df3DB41e2Fd4d4387B5D",
        DividendDistributor: "0x265BAB421f61EF6F0A0ab28229BAeDa86381f1b0",
        MaxBalanceModule: "0x90Ae280C9b591F136883A243661ce63df517108a",
        LockupModule: "0x847082755E336b629eD5B7d300a032587eD96058",
        RWATradeEscrow: "0x2ac12b2Dbf343146A11cCA2DC1467148DAEb4447",
        TokenizationFactory: "0x3D58fFF590d1E925fd0f510e96C20bc12691840F",
        KYCVerifier: "0xe57d2BA10a92eb04eD1B56Cb2dE9D67799782835",
      },
    },
    tokens: {
      USDC: "0x0000000000000000000000000000000000000000",
      USDT: "0x0000000000000000000000000000000000000000",
    },
    fees: {
      CREATION_FEE: "10000000000000000",
      CREATION_FEE_FORMATTED: "0.01",
      ESCROW_TRANSACTION_FEE_BPS: 100,
      ESCROW_TRANSACTION_FEE_PERCENT: "1",
    },
    kyc: {
      trustedSigner: "0xA2fF1ef754b3186f12d2d8D4D922CC31d7BF1969",
      system: "off-chain",
    },
    deployedAt: "2026-02-25",
    version: "2.0.0",
  },