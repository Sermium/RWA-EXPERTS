// src/app/api/kyc/link/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAddress, keccak256, toHex } from "viem";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    // Normalize address
    const normalizedWallet = getAddress(wallet);

    // Generate wallet hash
    const walletHashSecret = process.env.KYC_WALLET_HASH_SECRET!;
    const walletHash = keccak256(
      toHex(`${normalizedWallet.toLowerCase()}:${walletHashSecret}`)
    );

    // Check if this wallet has KYC or is linked
    const { data: kycApplication } = await supabase
      .from("kyc_applications")
      .select("wallet_hash")
      .eq("wallet_hash", walletHash)
      .single();

    // If wallet has direct KYC, get all linked wallets for that hash
    let primaryWalletHash = walletHash;

    // If no direct KYC, check if wallet is linked to another
    if (!kycApplication) {
      const { data: linkedWallet } = await supabase
        .from("linked_wallets")
        .select("wallet_hash")
        .eq("wallet_address", normalizedWallet)
        .single();

      if (linkedWallet) {
        primaryWalletHash = linkedWallet.wallet_hash;
      } else {
        // No KYC and not linked
        return NextResponse.json({ wallets: [] });
      }
    }

    // Get primary wallet from KYC applications
    const { data: primaryKyc } = await supabase
      .from("kyc_applications")
      .select("encrypted_wallet")
      .eq("wallet_hash", primaryWalletHash)
      .eq("status", "approved")
      .single();

    // Get all linked wallets
    const { data: linkedWallets } = await supabase
      .from("linked_wallets")
      .select("wallet_address, linked_at, is_primary")
      .eq("wallet_hash", primaryWalletHash)
      .order("linked_at", { ascending: true });

    // Build wallet list
    const wallets: Array<{
      address: string;
      linkedAt: string;
      isPrimary: boolean;
    }> = [];

    // Add primary wallet if we can decrypt it (or use a flag in DB)
    // For now, mark the first one as primary based on linked_wallets data
    if (linkedWallets) {
      for (const lw of linkedWallets) {
        wallets.push({
          address: lw.wallet_address,
          linkedAt: lw.linked_at,
          isPrimary: lw.is_primary || false,
        });
      }
    }

    // If current wallet has direct KYC and isn't in linked list, add it as primary
    if (kycApplication && !wallets.some(w => w.address.toLowerCase() === normalizedWallet.toLowerCase())) {
      wallets.unshift({
        address: normalizedWallet,
        linkedAt: new Date().toISOString(),
        isPrimary: true,
      });
    }

    return NextResponse.json({ wallets });
  } catch (error) {
    console.error("Error fetching linked wallets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
