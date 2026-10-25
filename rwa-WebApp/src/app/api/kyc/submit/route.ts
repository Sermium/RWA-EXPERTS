// src/app/api/kyc/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMessage, getAddress, keccak256, toHex } from "viem";
import { encryptField } from "@/lib/encryption";
import { DEPLOYMENTS } from "@/config/deployments";
import type { SupportedChainId } from "@/config/chains";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface KYCSubmission {
  walletAddress: string;
  signature: string;
  timestamp: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  dateOfBirth?: string;
  countryCode?: number;
  requestedLevel: number;
  documents?: {
    idFront?: string;
    idBack?: string;
    selfie?: string;
    addressProof?: string;
    accreditedProof?: string;
  };
  livenessVerification?: {
    passed: boolean;
    score: number;
    completedChallenges: number;
    totalChallenges: number;
    screenshots?: string[];
  };
  verificationScore?: number;
  txHash?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: KYCSubmission = await request.json();
    const chainIdHeader = request.headers.get('x-chain-id');
    console.log('[KYC Submit] Chain ID from header:', chainIdHeader);
    console.log('[KYC Submit] Body keys:', Object.keys(body));
    console.log('[KYC Submit] Has txHash:', !!body.txHash);
    
    const {
      walletAddress,
      signature,
      timestamp,
      firstName,
      lastName,
      email,
      dateOfBirth,
      countryCode,
      requestedLevel,
      documents,
      livenessVerification,
      verificationScore,
    } = body;

    // Validate required auth fields
    if (!walletAddress || !signature || !timestamp) {
      console.log('[KYC Submit] Missing auth fields');
      return NextResponse.json(
        { error: "Missing authentication fields" },
        { status: 400 }
      );
    }

    // Verify timestamp (5 minute window)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      return NextResponse.json(
        { error: "Request expired. Please try again." },
        { status: 400 }
      );
    }

    // Verify signature - accept both formats
    const possibleMessages = [
      `Submit KYC Application\nWallet: ${walletAddress}\nLevel: ${requestedLevel}\nTimestamp: ${timestamp}`,
      `KYC Application\nWallet: ${walletAddress}\nLevel: ${requestedLevel}\nTimestamp: ${timestamp}`,
    ];

    let isValid = false;
    for (const message of possibleMessages) {
      try {
        isValid = await verifyMessage({
          address: getAddress(walletAddress),
          message,
          signature: signature as `0x${string}`,
        });
        if (isValid) {
          console.log('[KYC Submit] Signature verified');
          break;
        }
      } catch {}
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Generate wallet hash
    const walletHashSecret = process.env.KYC_WALLET_HASH_SECRET!;
    const walletHash = keccak256(
      toHex(`${walletAddress.toLowerCase()}:${walletHashSecret}`)
    );

    // Check for existing approved application (to determine if this is an upgrade)
    const { data: existingUser } = await supabase
      .from("kyc_applications")
      .select("id, current_level, status, wallet_address, country_code, first_name, last_name, email, date_of_birth, documents, verification_score")
      .eq("wallet_hash", walletHash)
      .gte("current_level", 1)
      .order("current_level", { ascending: false })
      .limit(1)
      .single();

    const isUpgrade = !!existingUser && existingUser.current_level >= 1;
    const currentLevel = existingUser?.current_level || 0;

    console.log('[KYC Submit] isUpgrade:', isUpgrade, 'currentLevel:', currentLevel, 'requestedLevel:', requestedLevel);

    // For new users, require personal info
    if (!isUpgrade) {
      if (!firstName || !lastName || !email || !countryCode) {
        return NextResponse.json(
          { error: "Missing required personal information" },
          { status: 400 }
        );
      }
    }

    // Validate upgrade path
    if (isUpgrade && requestedLevel <= currentLevel) {
      return NextResponse.json(
        { error: `You are already at level ${currentLevel}. Select a higher level.` },
        { status: 400 }
      );
    }

    // Check for restricted countries
    const { data: settings } = await supabase
      .from("kyc_settings")
      .select("restricted_countries, auto_approval_enabled, auto_approval_max_level")
      .single();

    const userCountryCode = isUpgrade ? existingUser.country_code : countryCode;
    const restrictedCountries = settings?.restricted_countries || [408, 364, 760, 192];
    if (userCountryCode && restrictedCountries.includes(userCountryCode)) {
      return NextResponse.json(
        { error: "KYC applications from your jurisdiction are not accepted" },
        { status: 403 }
      );
    }

    // Get chain ID
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

    // What the applicant's browser says about its own checks -- the OCR
    // confidence, the liveness result -- is kept for the reviewer and decides
    // nothing. It is computed on the applicant's machine, so it is whatever
    // the applicant chooses to send. Approval is a reviewer's decision, and
    // the registration fee is paid afterwards, with the proof that approval
    // produces (see generate-proof and confirm-payment).
    const clientReported = {
      verificationScore: verificationScore ?? null,
      livenessVerification: livenessVerification ?? null,
      note: "Reported by the applicant's browser. Not verified by the server.",
    };

    // Handle UPGRADE flow
    if (isUpgrade) {
      console.log('[KYC Submit] Processing upgrade from level', currentLevel, 'to', requestedLevel);

      const mergedDocuments = {
        ...(existingUser.documents || {}),
        ...(documents || {}),
        clientReported,
      };

      // Every upgrade is reviewed. The level held so far stays until then.
      const newStatus = "pending";

      const { error: updateError } = await supabase
        .from("kyc_applications")
        .update({
          requested_level: requestedLevel,
          current_level: existingUser.current_level,
          status: newStatus,
          documents: mergedDocuments,
          verification_score: null,
          // tx_hash and approved_at are kept: the level already held stays
          // approved and registered while the upgrade is reviewed. Approving
          // the upgrade clears tx_hash (admin/kyc/approve), so the applicant
          // then registers the new level on chain.
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingUser.id);

      if (updateError) {
        console.error("Failed to update application:", updateError);
        return NextResponse.json(
          { error: "Failed to submit upgrade request" },
          { status: 500 }
        );
      }

      console.log('[KYC Submit] Upgrade status:', newStatus);

      return NextResponse.json({
        success: true,
        status: newStatus,
        autoApproved: false,
        applicationId: existingUser.id,
        message: "Your upgrade request has been submitted and is pending review.",
      });
    }

    // Handle NEW USER flow
    console.log('[KYC Submit] Processing new user application');

    // Check for existing application
    const { data: existingApp } = await supabase
      .from("kyc_applications")
      .select("id, status, requested_level")
      .eq("wallet_hash", walletHash)
      .eq("requested_level", requestedLevel)
      .single();

    if (existingApp) {
      console.log('[KYC Submit] Existing app found:', existingApp);

      if (existingApp.status === "pending" || existingApp.status === "pending_payment") {
        return NextResponse.json(
          { error: "You already have a pending application for this level" },
          { status: 400 }
        );
      }
      if (existingApp.status === "approved") {
        return NextResponse.json(
          { error: "You are already verified at this level" },
          { status: 400 }
        );
      }
      if (existingApp.status === "rejected") {
        // Delete rejected application to allow resubmission
        await supabase
          .from("kyc_applications")
          .delete()
          .eq("id", existingApp.id);

        await supabase
          .from("kyc_proofs")
          .delete()
          .eq("wallet_hash", walletHash)
          .eq("level", requestedLevel);
      }
    }

    // Encrypt PII fields
    const [encFirstName, encLastName, encEmail, encDOB] = await Promise.all([
      encryptField(firstName!),
      encryptField(lastName!),
      encryptField(email!),
      dateOfBirth ? encryptField(dateOfBirth) : null,
    ]);

    // Auto-approval used to fire for Bronze on the browser's own score -- or
    // on no score at all -- plus any string in `txHash`. Nothing the server
    // has verified says who this applicant is, so every application waits
    // for a reviewer. `kyc_settings.auto_approval_enabled` is ignored until
    // there is a server-side check for it to rest on.
    void settings?.auto_approval_enabled;
    const newStatus = "pending";
    const newCurrentLevel = 0;

    // Insert application
    const { data: application, error: insertError } = await supabase
      .from("kyc_applications")
      .insert({
        wallet_hash: walletHash,
        wallet_address: walletAddress,
        first_name: encFirstName,
        last_name: encLastName,
        email: encEmail,
        date_of_birth: encDOB,
        country_code: countryCode,
        requested_level: requestedLevel,
        current_level: newCurrentLevel,
        status: newStatus,
        verification_score: null,
        documents: { ...(documents || {}), clientReported },
        tx_hash: null,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        approved_at: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert application:", insertError);
      return NextResponse.json(
        { error: "Failed to submit application" },
        { status: 500 }
      );
    }

    // Link wallet
    await supabase.from("linked_wallets").upsert(
      {
        wallet_hash: walletHash,
        wallet_address: walletAddress,
        is_primary: true,
        linked_at: new Date().toISOString(),
      },
      { onConflict: "wallet_address" }
    );

    return NextResponse.json({
      success: true,
      status: newStatus,
      autoApproved: false,
      applicationId: application.id,
      message: "Your KYC application has been submitted and is pending review. Once it is approved, you complete registration by paying the fee.",
    });

  } catch (error) {
    console.error("Error submitting KYC:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
