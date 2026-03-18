
  // ==========================================================================
  // BNB TESTNET - Deployed 2026-02-25
  // KYC System: Off-chain (Supabase) + On-chain signature verification
  // KYC Tiers: Bronze ($20K), Silver ($200K), Gold ($2M), Platinum (Unlimited)
  // ==========================================================================
  97: {
    contracts: {
      KYCVerifier: "0x697430F860eC4eC6506317B0225861860B76c7d8",
      RWAProjectNFT: "0xe7F8a504C53E3B5e4E954a442D3f2627dD19b8c4",
      RWALaunchpadFactory: "0x0F0b2B1763C49758423f952dEf41d638C8dE7bDF",
      RWATokenizationFactory: "0x9Aad3BbaDc5ACa3Edf15285E0Fc8C8229d202438",
      RWASecurityExchange: "0xe233382adAb62B569D2b392FdeE5000457135D9c",
      OffChainInvestmentManager: "0x755dAd763799c33EA1C9441932be6997EafbE902",
      CountryRestrictModule: "0xf4f252ef2383CaCb54Fc75A48b7FD2D5dc66E577",
      AccreditedInvestorModule: "0x2dd0b32EeF71d963f84da652c15742A416393fe8",
      Implementations: {
        SecurityToken: "0x198E1fa20f0538A587C3D3C50Cd0CF7CC67A9052",
        EscrowVault: "0x8A962582446686b62D1F9d86dfe6D8c107f11357",
        Compliance: "0x73B699A1e7AF652027194d35A7DB3eD0AD6DF399",
        ProjectNFT: "0xc1E2682b9bDBB6341e346Bc4Dff9ccBB8fE0Bb09",
        OffChainManager: "0x30B0C77426dd7c3BCBC845099BEE931aE00904a6",
        Exchange: "0x99E6deBB20E6807904F8827D3b20aAe90353C9bC",
        DividendDistributor: "0xf49f7F8af071c50fE732b2488d569737628dE75E",
        MaxBalanceModule: "0x01B4286FdcBf99dFA42a06f90FB1058A397F7c2c",
        LockupModule: "0x540Cf149653495998a9e9474244c3612FB5f7e8a",
        RWATradeEscrow: "0x2b5C3b768D44457330646B205B6fC35666Da5d34",
        TokenizationFactory: "0xe58397be03574377F1A6cb1389a7B53d492d91BD",
        KYCVerifier: "0x9Bf2A9595805Fc23090a34411781CA039ca6fCDd",
      },
    },
    tokens: {
      USDC: "0x64544969ed7EBf5f083679233325356EbE738930",
      USDT: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
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