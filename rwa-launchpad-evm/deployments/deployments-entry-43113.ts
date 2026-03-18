
  // ==========================================================================
  // AVALANCHE FUJI - Deployed 2026-02-25
  // KYC System: Off-chain (Supabase) + On-chain signature verification
  // KYC Tiers: Bronze ($20K), Silver ($200K), Gold ($2M), Platinum (Unlimited)
  // ==========================================================================
  43113: {
    contracts: {
      KYCVerifier: "0x24F3c59582C8cf5772DB66C38e6375A0C305771B",
      RWAProjectNFT: "0x375f38Af0Bf16043F53790B400a4d6dCe0691199",
      RWALaunchpadFactory: "0xE01Da562794820FA44c8B25F02040ad0eAD7C3a2",
      RWATokenizationFactory: "0x4a8FBb0F4927094ab5caD161D90E7d68eB1eFF66",
      RWASecurityExchange: "0x35F9aeFb01C0098532c2eD5D8DB27FcBDc35C673",
      OffChainInvestmentManager: "0x28010D59A35c7fCFb51526e6C249Da6f75C94855",
      CountryRestrictModule: "0xa76D5a58738D3A0603B97622f557505993794d61",
      AccreditedInvestorModule: "0xED001C6E3a0A3Aa702F71729a9c24962f4a39721",
      Implementations: {
        SecurityToken: "0x4Af0b8DFc46A2c48A7F74eBc06b985e440C0Ab28",
        EscrowVault: "0x5F5c1822b69269b743241966dD772eeeD0574e05",
        Compliance: "0x2A9Fed3Db675b958E0195D38234195636e0f8a20",
        ProjectNFT: "0xb4D067E8177650f79215Cb62d1B550E2EaD9B6E1",
        OffChainManager: "0x2993fBcC23f6D856a55Ea1cD91a41FCD924AA722",
        Exchange: "0xF40e7C3da0bd9F8250Eb551D504fc7CA48e9A1d3",
        DividendDistributor: "0x4E59ad675B3d717321238BeC5F5559218B767a57",
        MaxBalanceModule: "0x64B2D2Be0e3C49f54F5Fe554C56Ca2682BacbF5c",
        LockupModule: "0xDc649B2690C8F68c86fbA71a1c9bC9d3eA9098a4",
        RWATradeEscrow: "0xEC96adb406d2660716fb1C0f042d35b506F5A4CB",
        TokenizationFactory: "0x212637019ad586250529C1937cBA2E6dfc28CCfC",
        KYCVerifier: "0x650396Dfaa1b4c02297B8E74dd41eFa5B32B893A",
      },
    },
    tokens: {
      USDC: "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786",
      USDT: "0x224e403397F3aec9a0D2875445dC32dB00ea31C3",
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