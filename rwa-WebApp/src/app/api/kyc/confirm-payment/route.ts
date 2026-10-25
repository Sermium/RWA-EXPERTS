// src/app/api/kyc/confirm-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { keccak256, toHex, createPublicClient, http, getAddress, parseEventLogs, parseAbi } from "viem";
import { CHAINS, type SupportedChainId } from "@/config/chains";
import { DEPLOYMENTS } from "@/config/deployments";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const KYC_VERIFIER_EVENTS = parseAbi([
  "event WalletRegistered(address indexed wallet, uint8 level, uint16 countryCode, uint256 fee)",
]);

/**
 * Records that an APPROVED applicant has registered on chain and paid the fee.
 *
 * It approves nothing. It used to: any successful transaction sent from the
 * wallet -- a transfer of nothing to itself would do -- turned the wallet's
 * pending application, at whatever level it asked for, into "approved".
 * Approval is a reviewer's decision (admin/kyc/approve); this route only
 * notes the registration that follows it.
 *
 * The transaction must be a successful call to this chain's KYCVerifier,
 * sent by the wallet itself, whose receipt carries the contract's own
 * WalletRegistered event for that wallet at the approved level -- the event
 * the contract emits only after taking the fee and checking the proof. A
 * transaction already recorded against an application is refused.
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress, txHash } = await request.json();
    const chainIdHeader = request.headers.get("x-chain-id");
    const chainId = (chainIdHeader ? parseInt(chainIdHeader) : 80002) as SupportedChainId;

    if (!walletAddress || !txHash || !/^0x[0-9a-fA-F]{64}$/.test(String(txHash))) {
      return NextResponse.json({ success: false, error: "Missing or malformed fields" }, { status: 400 });
    }

    const chainInfo = CHAINS[chainId];
    const verifier = DEPLOYMENTS[chainId]?.contracts?.KYCVerifier;
    if (!chainInfo || !verifier) {
      return NextResponse.json({ success: false, error: `Unsupported chain: ${chainId}` }, { status: 400 });
    }

    const wallet = getAddress(walletAddress);
    const publicClient = createPublicClient({ chain: chainInfo.chain, transport: http(chainInfo.rpcUrl) });

    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (!receipt || receipt.status !== "success") {
      return NextResponse.json({ success: false, error: "Transaction not confirmed" }, { status: 400 });
    }
    if (getAddress(receipt.from) !== wallet) {
      return NextResponse.json({ success: false, error: "Sender mismatch" }, { status: 400 });
    }
    if (!receipt.to || getAddress(receipt.to) !== getAddress(verifier)) {
      return NextResponse.json({ success: false, error: "Not a KYC registration" }, { status: 400 });
    }

    const registered = parseEventLogs({ abi: KYC_VERIFIER_EVENTS, logs: receipt.logs, eventName: "WalletRegistered" })
      .filter((l) => getAddress(l.address) === getAddress(verifier) && getAddress(l.args.wallet) === wallet);
    if (registered.length === 0) {
      return NextResponse.json({ success: false, error: "No registration for this wallet in that transaction" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: reused } = await supabase
      .from("kyc_applications")
      .select("id")
      .eq("tx_hash", txHash)
      .limit(1)
      .maybeSingle();
    if (reused) {
      return NextResponse.json({ success: false, error: "This transaction has already been recorded" }, { status: 409 });
    }

    const walletHash = keccak256(toHex(`${walletAddress.toLowerCase()}:${process.env.KYC_WALLET_HASH_SECRET}`));
    const { data: application, error: findError } = await supabase
      .from("kyc_applications")
      .select("id, current_level, tx_hash")
      .eq("wallet_hash", walletHash)
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError || !application) {
      return NextResponse.json({ success: false, error: "No approved application for this wallet" }, { status: 404 });
    }
    if (!registered.some((l) => Number(l.args.level) === Number(application.current_level))) {
      return NextResponse.json({ success: false, error: "The registration is not for the approved level" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("kyc_applications")
      .update({ tx_hash: txHash, updated_at: new Date().toISOString() })
      .eq("id", application.id);

    if (updateError) {
      console.error("[Confirm Payment] Update error:", updateError);
      return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ success: true, applicationId: application.id });
  } catch (error: any) {
    console.error("[Confirm Payment] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
