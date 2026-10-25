// src/app/api/notifications/send/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { validateAdminAccess } from '@/lib/admin';
import { getSupabaseAdmin } from '@/lib/supabase';
import { emailTemplates, sendEmail } from '@/lib/notifications/email-templates';

type NotificationType = 
  | 'trade_update'
  | 'payment_received'
  | 'payment_sent'
  | 'document_uploaded'
  | 'document_verified'
  | 'milestone_completed'
  | 'dispute_opened'
  | 'dispute_update'
  | 'message_received'
  | 'kyc_update'
  | 'system_alert';

interface SendNotificationRequest {
  userAddress: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  actionUrl?: string;
  emailTemplate?: string;
  emailData?: Record<string, any>;
}

function hasInternalApiKey(request: NextRequest): boolean {
  const expected = process.env.INTERNAL_API_KEY;
  const given = request.headers.get('x-api-key');
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  // An internal call with INTERNAL_API_KEY, or a signed-in admin. This used
  // to let in anyone who sent any x-wallet-address header -- and, with
  // INTERNAL_API_KEY unset, anyone who sent no key at all.
  if (!hasInternalApiKey(request)) {
    const auth = await validateAdminAccess(request);
    if (!auth.isValid) return auth.error;
  }

  try {
    const body: SendNotificationRequest = await request.json();
    const {
      userAddress,
      type,
      title,
      message,
      data = {},
      priority = 'medium',
      actionUrl,
      emailTemplate,
      emailData,
    } = body;

    if (!userAddress || !type || !title || !message) {
      return NextResponse.json(
        { error: 'userAddress, type, title, and message are required' },
        { status: 400 }
      );
    }

    // 1. Create notification in database
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_address: userAddress.toLowerCase(),
        type,
        title,
        message,
        data,
        priority,
        action_url: actionUrl,
        read: false,
      })
      .select()
      .single();

    if (notifError) throw notifError;

    // 2. Get user's notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_address', userAddress.toLowerCase())
      .single();

    // 3. Determine which channels to use
    const channels: string[] = ['inApp']; // Always send in-app
    
    if (prefs?.preferences) {
      // Find the category for this notification type
      const categoryMap: Record<string, string> = {
        trade_update: 'trade',
        payment_received: 'payment',
        payment_sent: 'payment',
        document_uploaded: 'document',
        document_verified: 'document',
        milestone_completed: 'trade',
        dispute_opened: 'dispute',
        dispute_update: 'dispute',
        message_received: 'trade',
        kyc_update: 'kyc',
        system_alert: 'system',
      };
      
      const category = categoryMap[type] || 'system';
      const categoryPrefs = prefs.preferences.find((p: any) => p.category === category);
      
      if (categoryPrefs?.channels) {
        if (categoryPrefs.channels.email) channels.push('email');
        if (categoryPrefs.channels.push) channels.push('push');
        if (categoryPrefs.channels.sms && priority === 'critical') channels.push('sms');
      }
    } else {
      // Default: send email for medium+ priority
      if (priority !== 'low') channels.push('email');
    }

    // 4. Send to each channel
    const deliveryResults: any[] = [];

    for (const channel of channels) {
      try {
        let status = 'sent';
        let providerResponse = null;

        if (channel === 'email' && prefs?.contact_info?.email && prefs?.contact_info?.emailVerified) {
          // Send email
          if (emailTemplate && emailTemplates[emailTemplate as keyof typeof emailTemplates]) {
            const templateFn = emailTemplates[emailTemplate as keyof typeof emailTemplates];
            const template = templateFn({
              recipientName: emailData?.recipientName || 'User',
              recipientEmail: prefs.contact_info.email,
              ...emailData,
            });
            
            try {
              providerResponse = await sendEmail(template, prefs.contact_info.email);
              status = 'delivered';
            } catch (emailError) {
              status = 'failed';
              providerResponse = { error: (emailError as Error).message };
            }
          }
        }

        // Log delivery
        const { data: deliveryLog } = await supabase
          .from('notification_delivery_log')
          .insert({
            notification_id: notification.id,
            channel,
            status,
            provider_response: providerResponse,
            delivered_at: status === 'delivered' ? new Date().toISOString() : null,
          })
          .select()
          .single();

        deliveryResults.push(deliveryLog);
      } catch (channelError) {
        console.error(`Error sending to ${channel}:`, channelError);
      }
    }

    return NextResponse.json({
      success: true,
      notification,
      deliveryResults,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
