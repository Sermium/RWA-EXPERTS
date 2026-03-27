// src/app/api/kyc/proof/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMessage, getAddress, keccak256, toHex } from "viem";
import { signTypedData } from "viem/accounts";
import { DEPLOYMENTS } from "@/config/deployments";
import type { SupportedChainId } from "@/config/chains";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");
    const signature = searchParams.get("signature");
    const timestamp = searchParams.get("timestamp");

    const chainIdHeader = request.headers.get("x-chain-id");
    const chainId = Number(chainIdHeader) as SupportedChainId;
    if (!chainId) {
      return NextResponse.json(
        { error: "Missing chain ID" },
        { status: 400 }
      );
    }

    const deployment = DEPLOYMENTS[chainId as SupportedChainId];
    if (!deployment?.contracts?.KYCVerifier) {
      return NextResponse.json(
        { error: "KYC Verifier not deployed on this chain" },
        { status: 400 }
      );
    }

    if (!walletAddress || !signature || !timestamp) {
      return NextResponse.json(
        { error: "Missing required parameters: wallet, signature, timestamp" },
        { status: 400 }
      );
    }

    // Check timestamp is within 5 minutes
    const requestTime = parseInt(timestamp);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - requestTime) > 300) {
      return NextResponse.json(
        { error: "Request expired. Please try again." },
        { status: 400 }
      );
    }

    // Verify signature to authenticate the request
    const message = `Get KYC Proof\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`;

    let isValid = false;
    try {
      isValid = await verifyMessage({
        address: getAddress(walletAddress),
        message,
        signature: signature as `0x${string}`,
      });
    } catch (e) {
      console.error("Signature verification failed:", e);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Generate wallet hash
    const walletHashSecret = process.env.KYC_WALLET_HASH_SECRET;
    if (!walletHashSecret) {
      console.error("KYC_WALLET_HASH_SECRET not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const walletHash = keccak256(
      toHex(`${walletAddress.toLowerCase()}:${walletHashSecret}`)
    );

    // Look up approved application
    const { data: application, error: appError } = await supabase
      .from("kyc_applications")
      .select("*")
      .eq("wallet_hash", walletHash)
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (appError || !application) {
      // Check if there's a pending application
      const { data: pendingApp } = await supabase
        .from("kyc_applications")
        .select("status, requested_level")
        .eq("wallet_hash", walletHash)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .single();

      if (pendingApp) {
        return NextResponse.json({
          hasProof: false,
          status: pendingApp.status,
          requestedLevel: pendingApp.requested_level,
          message:
            pendingApp.status === "pending"
              ? "Your KYC application is pending review"
              : pendingApp.status === "rejected"
              ? "Your KYC application was rejected. Please resubmit."
              : "No valid proof found",
        });
      }

      return NextResponse.json({
        hasProof: false,
        status: "none",
        message: "No KYC application found. Please submit KYC first.",
      });
    }

    // Generate fresh proof
    const signerPrivateKey = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;
    if (!signerPrivateKey) {
      console.error("VERIFIER_PRIVATE_KEY not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const PROOF_VALIDITY_DAYS = parseInt(process.env.KYC_VALIDITY_DAYS || "365");
    const expiry = Math.floor(Date.now() / 1000) + PROOF_VALIDITY_DAYS * 24 * 60 * 60;

    const DOMAIN = {
      name: "RWA KYC Verifier",
      version: "1",
      chainId: chainId,
      verifyingContract: deployment.contracts.KYCVerifier as `0x${string}`,
    };

    const KYC_PROOF_TYPES = {
      KYCProof: [
        { name: "wallet", type: "address" },
        { name: "level", type: "uint8" },
        { name: "countryCode", type: "uint16" },
        { name: "expiry", type: "uint256" },
      ],
    } as const;

    const proofSignature = await signTypedData({
      privateKey: signerPrivateKey,
      domain: DOMAIN,
      types: KYC_PROOF_TYPES,
      primaryType: "KYCProof",
      message: {
        wallet: getAddress(walletAddress),
        level: application.current_level,
        countryCode: application.country_code,
        expiry: BigInt(expiry),
      },
    });

    return NextResponse.json({
      hasProof: true,
      proof: {
        level: application.current_level,
        countryCode: application.country_code,
        expiry,
        signature: proofSignature,
      },
      expiresIn: expiry - now,
      message: "Valid KYC proof generated",
    });
  } catch (error) {
    console.error("Error fetching KYC proof:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
