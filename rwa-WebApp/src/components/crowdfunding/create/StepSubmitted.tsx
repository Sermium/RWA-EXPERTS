'use client';

import Link from 'next/link';
import { CheckCircle, Clock, FileText, Mail, ArrowRight } from 'lucide-react';
import { COMPANY, CONTACT } from '@/config/contacts';

interface StepSubmittedProps {
  projectName: string;
  applicationId: string | null;
  paymentMethod: 'card' | 'crypto' | null;
  isResubmit?: boolean;
}

export default function StepSubmitted({
  projectName,
  applicationId,
  paymentMethod,
  isResubmit = false,
}: StepSubmittedProps) {
  return (
    <div className="max-w-2xl mx-auto text-center py-8">
      {/* Success Icon */}
      <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-success" />
      </div>

      {/* Title */}
      <h2 className="text-3xl font-bold text-ink mb-4">{isResubmit ? 'Application Resubmitted!' : 'Application Submitted!'}</h2>

      <p className="text-xl text-ink-muted mb-8">
        Your project "<span className="text-gold-400 font-medium">{projectName}</span>" has been
        {isResubmit ? ' resubmitted' : ' submitted'} for review.
      </p>

      {/* Application ID */}
      {applicationId && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-8 inline-block">
          <p className="text-sm text-ink-muted mb-1">Application Reference</p>
          <p className="text-lg font-mono text-ink">{applicationId}</p>
        </div>
      )}

      {/* What Happens Next */}
      <div className="bg-surface/50 border border-border rounded-xl p-6 mb-8 text-left">
        <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gold-400" />
          What Happens Next?
        </h3>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-gold-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-gold-400 font-bold text-sm">1</span>
            </div>
            <div>
              <p className="text-ink font-medium">Document Review</p>
              <p className="text-sm text-ink-muted">
                Our team will review your submitted documents and verify all information. This
                typically takes 2-3 business days.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-gold-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-gold-400 font-bold text-sm">2</span>
            </div>
            <div>
              <p className="text-ink font-medium">Compliance Check</p>
              <p className="text-sm text-ink-muted">
                We'll ensure your project meets all regulatory requirements for tokenized
                securities.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-gold-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-gold-400 font-bold text-sm">3</span>
            </div>
            <div>
              <p className="text-ink font-medium">Approval & Deployment</p>
              <p className="text-sm text-ink-muted">
                Once approved, our team will deploy your project's smart contracts and notify you
                when it's live.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-success font-bold text-sm">4</span>
            </div>
            <div>
              <p className="text-ink font-medium">Go Live</p>
              <p className="text-sm text-ink-muted">
                Your project will be listed on the platform and open for investment!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Email Notification */}
      <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-8 flex items-start gap-3 text-left">
        <Mail className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-warning font-medium">Check Your Email</p>
          <p className="text-sm text-warning/80">
            We've sent a confirmation email with your application details. You'll receive updates
            on your application status via email.
          </p>
        </div>
      </div>

      {/* Review Timeline */}
      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between text-sm">
          <div className="text-center">
            <div className="w-4 h-4 bg-success rounded-full mx-auto mb-2" />
            <p className="text-success font-medium">Submitted</p>
            <p className="text-ink-faint text-xs">Just now</p>
          </div>
          <div className="flex-1 h-0.5 bg-surface-overlay mx-2" />
          <div className="text-center">
            <div className="w-4 h-4 bg-border-strong rounded-full mx-auto mb-2 animate-pulse" />
            <p className="text-ink-muted font-medium">In Review</p>
            <p className="text-ink-faint text-xs">2-3 days</p>
          </div>
          <div className="flex-1 h-0.5 bg-surface-overlay mx-2" />
          <div className="text-center">
            <div className="w-4 h-4 bg-surface-overlay rounded-full mx-auto mb-2" />
            <p className="text-ink-faint font-medium">Approved</p>
            <p className="text-ink-faint text-xs">Pending</p>
          </div>
          <div className="flex-1 h-0.5 bg-surface-overlay mx-2" />
          <div className="text-center">
            <div className="w-4 h-4 bg-surface-overlay rounded-full mx-auto mb-2" />
            <p className="text-ink-faint font-medium">Live</p>
            <p className="text-ink-faint text-xs">Pending</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-surface-overlay hover:bg-border-strong text-ink font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <FileText className="w-5 h-5" />
          View My Applications
        </Link>
        <Link
          href="/projects"
          className="px-6 py-3 bg-gold-600 hover:bg-gold-700 text-ink font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Browse Projects
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Support */}
      <p className="text-sm text-ink-faint mt-8">
        Questions? Contact us at{' '}
        <a href={`mailto:${CONTACT.general}`} className="text-gold-400 hover:underline">
          {CONTACT.general}
        </a>
      </p>
    </div>
  );
}