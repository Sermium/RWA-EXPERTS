import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateAdminAccess } from '@/lib/admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const REJECTION_REASONS: Record<string, string> = {
  invalid_document: "Invalid or unreadable document",
  expired_document: "Expired identity document",
  mismatch: "Information mismatch",
  selfie_mismatch: "Selfie does not match ID photo",
  restricted_country: "Restricted jurisdiction",
  suspicious_activity: "Suspicious activity detected",
  incomplete: "Incomplete documentation",
  other: "Other"
};

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const auth = await validateAdminAccess(request);
    if (!auth.isValid) return auth.error;
    const walletAddress = auth.walletAddress;

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { applicationId, reason, notes } = body;

    console.log("Reject endpoint received:", { applicationId, reason, notes, walletAddress });

    // Validate required fields
    if (!applicationId) {
      return NextResponse.json({ error: "Missing required field: applicationId" }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: "Missing required field: reason" }, { status: 400 });
    }

    // Validate reason
    if (!REJECTION_REASONS[reason]) {
      return NextResponse.json({ error: `Invalid rejection reason: ${reason}` }, { status: 400 });
    }

    // Get application
    const { data: application, error: fetchError } = await supabase
      .from("kyc_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (fetchError || !application) {
      console.error("Application fetch error:", fetchError);
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.status !== "pending") {
      return NextResponse.json({ error: `Application is not pending (current: ${application.status})` }, { status: 400 });
    }

    // Rejecting an upgrade leaves the level already approved in place: the
    // applicant goes back to "approved" at current_level, with the reason
    // on record. Only a first application ends up "rejected".
    const isUpgrade = Number(application.current_level) >= 1;

    // Update application
    const { error: updateError } = await supabase
      .from("kyc_applications")
      .update({
        status: isUpgrade ? "approved" : "rejected",
        ...(isUpgrade ? { requested_level: application.current_level } : {}),
        rejection_reason: reason,
        rejection_reason_text: REJECTION_REASONS[reason],
        notes: notes || null,
        updated_at: new Date().toISOString(),
        rejected_by: walletAddress.toLowerCase(),
        rejected_at: new Date().toISOString()
      })
      .eq("id", applicationId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
    }

    // Log activity
    try {
      await supabase.from("admin_activity_log").insert({
        action: "REJECT_KYC",
        actor_address: walletAddress.toLowerCase(),
        target_address: application.wallet_address?.toLowerCase() || null,
        details: {
          application_id: applicationId,
          wallet_hash: application.wallet_hash,
          requested_level: application.requested_level,
          reason,
          reason_text: REJECTION_REASONS[reason],
          notes: notes || null
        },
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error("Activity log error:", logError);
    }

    return NextResponse.json({
      success: true,
      message: isUpgrade
        ? "Upgrade rejected. The applicant keeps their current level."
        : "Application rejected successfully"
    });

  } catch (error) {
    console.error("Reject endpoint error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
