# ---------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------
### RWA Launchpad - Complete API Documentation

## Base URL https://your-domain.com/api

## Authentication
Most endpoints require wallet authentication via header:

x-wallet-address: 0x1234...abcd
API Endpoints by Category
# ---------------------------------------------------------------------------------------------------------
1. Health & Status
# ---------------------------------------------------------------------------------------------------------
# GET /api/health
Check API availability.
Authentication: None
Response (200):

{
  "status": "ok",
  "timestamp": "2026-03-06T12:00:00Z"
}
# ---------------------------------------------------------------------------------------------------------
2. Tokenization Applications
# ---------------------------------------------------------------------------------------------------------
# POST /api/tokenization/apply
Submit a new tokenization application.Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "companyName": "string",
  "contactName": "string",
  "email": "string",
  "phone": "string (optional)",
  "website": "string (optional)",
  "assetType": "real_estate | commodity | company_equity | art | infrastructure | ip | other",
  "assetName": "string",
  "assetDescription": "string",
  "estimatedValue": "string | number",
  "useCase": "string (optional)",
  "needsEscrow": "boolean",
  "needsDividends": "boolean",
  "documents": [
    {
      "name": "string",
      "url": "string",
      "type": "string",
      "size": "number"
    }
  ]
}
Response (201):

{
  "success": true,
  "application": {
    "id": "uuid",
    "status": "pending",
    "fee_amount": 750,
    "fee_currency": "USDC",
    "needs_escrow": false,
    "needs_dividends": false
  }
}
Errors:

Code	Message
401	    Wallet address required
500	    Failed to submit application
# ---------------------------------------------------------------------------------------------------------
# GET /api/tokenization/apply
Get all applications for authenticated user.Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "applications": [
    {
      "id": "uuid",
      "asset_name": "string",
      "asset_type": "string",
      "status": "pending | approved | rejected | completed",
      "fee_amount": 750,
      "fee_currency": "USDC",
      "created_at": "2026-03-06T12:00:00Z",
      "updated_at": "2026-03-06T12:00:00Z"
    }
  ]
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/tokenization/[id]
Get specific application by ID.Authentication: Required

Headers:
x-wallet-address: string (required)
Parameters:
Param	Type	Description
id	string	Application UUID
Response (200):

{
  "id": "uuid",
  "user_address": "0x...",
  "asset_name": "string",
  "asset_type": "string",
  "asset_description": "string",
  "estimated_value": 1000000,
  "legal_entity_name": "string",
  "contact_name": "string",
  "contact_email": "string",
  "contact_phone": "string",
  "website": "string",
  "use_case": "string",
  "needs_escrow": false,
  "needs_dividends": false,
  "documents": {
    "files": []
  },
  "status": "pending",
  "admin_notes": "string | null",
  "rejection_reason": "string | null",
  "fee_amount": 750,
  "fee_currency": "USDC",
  "token_address": "0x... | null",
  "escrow_address": "0x... | null",
  "nft_token_id": "number | null",
  "deployment_tx_hash": "0x... | null",
  "created_at": "2026-03-06T12:00:00Z",
  "updated_at": "2026-03-06T12:00:00Z"
}

Errors:

Code	Message
401	    Wallet address required
403	    Unauthorized
404	    Application not found
# ---------------------------------------------------------------------------------------------------------
# PUT /api/tokenization/[id]/resubmit
Resubmit a rejected application.Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Parameters:
Param	Type	Description
id	string	Application UUID
Request Body:

{
  "companyName": "string",
  "contactName": "string",
  "email": "string",
  "phone": "string",
  "website": "string",
  "assetType": "string",
  "assetName": "string",
  "assetDescription": "string",
  "estimatedValue": "string | number",
  "useCase": "string",
  "needsEscrow": "boolean",
  "needsDividends": "boolean",
  "feeAmount": "number",
  "documents": []
}
Response (200):

{
  "success": true,
  "application": { ... }
}

Errors:
Code	Message
400	    Only rejected applications can be resubmitted
401	    Wallet address required
403	    Unauthorized
404	    Application not found
# ---------------------------------------------------------------------------------------------------------
# POST /api/tokenization/[id]/pay
Record payment for application.Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "txHash": "0x...",
  "paymentToken": "0x...",
  "amount": "750"
}
Response (200):

{
  "success": true,
  "application": { ... }
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/tokenization/[id]/deploy
Record deployment details after token creation.Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "tokenAddress": "0x...",
  "escrowAddress": "0x...",
  "nftAddress": "0x...",
  "nftTokenId": "number",
  "projectId": "number",
  "deploymentTxHash": "0x...",
  "metadataUri": "ipfs://..."
}
Response (200):

{
  "success": true,
  "application": { ... }
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/tokenization/[id]/cancel
Cancel an application.Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "success": true,
  "message": "Application cancelled"
}
# ---------------------------------------------------------------------------------------------------------
3. KYC Endpoints
# ---------------------------------------------------------------------------------------------------------
# GET /api/kyc/status/[address]
Get KYC status for a wallet address.
Authentication: None

Parameters:Param	Type	Description
address	string	Wallet address (0x...)
Response (200):

{
  "address": "0x...",
  "tier": "none | bronze | silver | gold",
  "verified": true,
  "country": "US",
  "expiresAt": "2027-03-06T12:00:00Z",
  "canInvest": true,
  "canCreateProject": true
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/kyc/status
Get KYC status for authenticated user.Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "address": "0x...",
  "tier": "silver",
  "verified": true,
  "country": "BR",
  "documents": {
    "idUploaded": true,
    "proofOfAddress": true,
    "livenessCompleted": true
  }
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/kyc/limits
Get investment limits per KYC tier.
Authentication: None

Response (200):

{
  "tiers": {
    "none": {
      "maxInvestment": 0,
      "canInvest": false,
      "canCreate": false
    },
    "bronze": {
      "maxInvestment": 1000,
      "canInvest": true,
      "canCreate": false
    },
    "silver": {
      "maxInvestment": 10000,
      "canInvest": true,
      "canCreate": false
    },
    "gold": {
      "maxInvestment": -1,
      "canInvest": true,
      "canCreate": true
    }
  }
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/kyc/submit
Submit KYC application.Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "tier": "bronze | silver | gold",
  "firstName": "string",
  "lastName": "string",
  "dateOfBirth": "YYYY-MM-DD",
  "country": "string (ISO code)",
  "documentType": "passport | id_card | drivers_license",
  "documentNumber": "string",
  "email": "string"
}
Response (201):

{
  "success": true,
  "submissionId": "uuid",
  "status": "pending"
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/kyc/upload
Upload KYC document.Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: multipart/form-data
Request Body:

file: File
documentType: "id_front" | "id_back" | "selfie" | "proof_of_address"
Response (200):

{
  "success": true,
  "documentId": "uuid",
  "url": "encrypted-url"
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/kyc/fee
Get current KYC fee.
Authentication: None

Response (200):

{
  "fee": "10",
  "currency": "USDC",
  "chainId": 25
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/kyc/confirm-payment
Confirm KYC fee payment.Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "txHash": "0x...",
  "chainId": 25
}
Response (200):

{
  "success": true,
  "status": "payment_confirmed"
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/kyc/countries
Get list of supported countries.
Authentication: None

Response (200):

{
  "countries": [
    { "code": "US", "name": "United States", "restricted": false },
    { "code": "BR", "name": "Brazil", "restricted": false },
    { "code": "KP", "name": "North Korea", "restricted": true }
  ]
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/kyc/liveness-session
Create liveness verification session.Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "sessionId": "uuid",
  "sessionUrl": "https://...",
  "expiresAt": "2026-03-06T13:00:00Z"
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/kyc/liveness-session/[sessionId]
Get liveness session status.Authentication: Required

Parameters:Param	Type	Description
sessionId	string	Session UUID
Response (200):

{
  "sessionId": "uuid",
  "status": "pending | completed | failed",
  "result": {
    "livenessConfirmed": true,
    "faceMatch": true
  }
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/kyc/documents/[address]
Get uploaded documents for address.Authentication: Required (Admin or owner)

Response (200):

{
  "documents": [
    {
      "id": "uuid",
      "type": "id_front",
      "uploadedAt": "2026-03-06T12:00:00Z",
      "verified": true
    }
  ]
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/kyc/email/[address]
Get email associated with KYC.Authentication: Required (Admin)

Response (200):

{
  "email": "user@example.com"
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/kyc/generate-proof
Generate on-chain KYC proof.Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "proof": {
    "tier": 3,
    "country": "BR",
    "expiry": 1735689600,
    "signature": "0x..."
  }
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/kyc/proof
Get existing KYC proof.Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "hasProof": true,
  "proof": { ... }
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/kyc/level
Get detailed KYC level info.Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "level": 2,
  "tierName": "silver",
  "requirements": {
    "idVerified": true,
    "addressVerified": true,
    "livenessVerified": true,
    "accreditationVerified": false
  },
  "nextTier": {
    "name": "gold",
    "missingRequirements": ["accreditationVerified"]
  }
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/kyc/pending-upgrades
Get pending tier upgrade requests.Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Response (200):

{
  "upgrades": [
    {
      "address": "0x...",
      "currentTier": "silver",
      "requestedTier": "gold",
      "submittedAt": "2026-03-06T12:00:00Z"
    }
  ]
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/kyc/verify-document
Verify uploaded document.Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "documentId": "uuid",
  "verified": true,
  "notes": "string (optional)"
}
Response (200):

{
  "success": true
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/kyc/link/generate
Generate wallet linking code.
Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "linkCode": "ABC123",
  "expiresAt": "2026-03-06T13:00:00Z"
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/kyc/link/use
Use wallet linking code.
Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "linkCode": "ABC123"
}
Response (200):

{
  "success": true,
  "linkedTo": "0x..."
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/kyc/link/list
Get linked wallets.
Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "linkedWallets": [
    {
      "address": "0x...",
      "linkedAt": "2026-03-06T12:00:00Z",
      "isPrimary": false
    }
  ]
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/kyc/gdpr/export
Export user data (GDPR).
Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "success": true,
  "downloadUrl": "https://...",
  "expiresAt": "2026-03-07T12:00:00Z"
}
# ---------------------------------------------------------------------------------------------------------
# DELETE /api/kyc/gdpr/delete
Delete user data (GDPR).
Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "success": true,
  "message": "Data deletion scheduled"
}
# ---------------------------------------------------------------------------------------------------------
# DELETE /api/kyc/reset/[address]
Reset KYC for address (Admin).
Authentication: Required (Admin)

Parameters:
Param	Type	Description
address	string	Wallet address
Response (200):

{
  "success": true
}
# ---------------------------------------------------------------------------------------------------------
4. Admin Endpoints
# ---------------------------------------------------------------------------------------------------------
# GET /api/admin/check
Check if wallet is admin.
Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "isAdmin": true,
  "role": "super_admin | admin | moderator"
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/admin/list
Get list of admin wallets.

Authentication: None

Response (200):

{
  "admins": ["0x...", "0x..."]
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/admin/role
Get admin role details.
Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "address": "0x...",
  "role": "admin",
  "permissions": ["kyc_review", "project_approval", "user_management"]
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/admin/promote
Promote user to admin.
Authentication: Required (Super Admin)

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "targetAddress": "0x...",
  "role": "admin | moderator"
}
Response (200):

{
  "success": true
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/admin/demote
Remove admin privileges.
Authentication: Required (Super Admin)

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "targetAddress": "0x..."
}
Response (200):

{
  "success": true
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/admin/activity
Get admin activity log.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Query Parameters:
Param	Type	Description
page	number	Page number (default: 1)
limit	number	Items per page (default: 50)
Response (200):

{
  "activities": [
    {
      "id": "uuid",
      "adminAddress": "0x...",
      "action": "kyc_approved",
      "targetAddress": "0x...",
      "details": {},
      "createdAt": "2026-03-06T12:00:00Z"
    }
  ],
  "total": 100,
  "page": 1
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/admin/tokenizations
Get all tokenization applications.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Query Parameters:
Param	Type	Description
page	number	Page number (default: 1)
limit	number	Items per page (default: 10)
status	string	Filter by status
search	string	Search term
Response (200):

{
  "applications": [...],
  "total": 100,
  "page": 1,
  "limit": 10
}
PATCH /api/admin/tokenizations
Update application status.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "applicationId": "uuid",
  "status": "pending | approved | rejected | completed",
  "adminNotes": "string (optional)"
}
Response (200):

{
  "success": true,
  "application": { ... }
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/admin/tokenization/stats
Get tokenization statistics.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Response (200):

{
  "total": 150,
  "pending": 25,
  "approved": 45,
  "rejected": 30,
  "completed": 50,
  "totalValue": 75000000,
  "totalFees": 112500
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/admin/kyc/applications
Get all KYC applications.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Query Parameters:
Param	Type	Description
status	string	Filter by status
tier	string	Filter by tier
page	number	Page number
limit	number	Items per page
Response (200):

{
  "applications": [
    {
      "id": "uuid",
      "address": "0x...",
      "tier": "silver",
      "status": "pending",
      "submittedAt": "2026-03-06T12:00:00Z"
    }
  ],
  "total": 50
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/admin/kyc/approve
Approve KYC application.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "applicationId": "uuid",
  "tier": "bronze | silver | gold",
  "notes": "string (optional)"
}
Response (200):

{
  "success": true
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/admin/kyc/reject
Reject KYC application.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "applicationId": "uuid",
  "reason": "string"
}
Response (200):

{
  "success": true
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/admin/kyc/stats
Get KYC statistics.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Response (200):

{
  "total": 5000,
  "verified": 3500,
  "pending": 500,
  "rejected": 1000,
  "byTier": {
    "bronze": 2000,
    "silver": 1200,
    "gold": 300
  },
  "byCountry": {
    "BR": 1500,
    "US": 800
  }
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/admin/kyc/settings
Get KYC settings.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Response (200):

{
  "kycFee": "10",
  "feeCurrency": "USDC",
  "autoApproveEnabled": false,
  "restrictedCountries": ["KP", "IR", "CU"]
}
# ---------------------------------------------------------------------------------------------------------
# PUT /api/admin/kyc/settings
Update KYC settings.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "kycFee": "15",
  "autoApproveEnabled": true,
  "restrictedCountries": ["KP", "IR"]
}
Response (200):

{
  "success": true
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/admin/kyc/document/[id]
Get KYC document.
Authentication: Required (Admin)

Parameters:
Param	Type	Description
id	string	Document UUID
Response (200):

{
  "id": "uuid",
  "type": "id_front",
  "url": "decrypted-url",
  "uploadedAt": "2026-03-06T12:00:00Z"
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/admin/settings/fee
Get platform fee settings.
Authentication: Required (Admin)

Response (200):

{
  "baseFee": 750,
  "escrowFee": 250,
  "dividendFee": 200,
  "platformPercent": 5,
  "currency": "USDC"
}
# ---------------------------------------------------------------------------------------------------------
# PUT /api/admin/settings/fee
Update platform fees.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "baseFee": 800,
  "platformPercent": 4
}
Response (200):

{
  "success": true
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/admin/email/test
Send test email.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "to": "test@example.com",
  "template": "welcome | kyc_approved | project_approved"
}
Response (200):

{
  "success": true,
  "messageId": "string"
}
# ---------------------------------------------------------------------------------------------------------
5. Project Endpoints
# ---------------------------------------------------------------------------------------------------------
# GET /api/projects/list
Get all public projects.

Authentication: None

Query Parameters:
Param	Type	Description
page	number	Page number
limit	number	Items per page
category	string	Filter by category
status	string	Filter by status
Response (200):

{
  "projects": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "category": "string",
      "tokenAddress": "0x...",
      "fundingGoal": 1000000,
      "fundingRaised": 500000,
      "status": "active",
      "createdAt": "2026-03-06T12:00:00Z"
    }
  ],
  "total": 50
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/projects/[id]
Get project details.

Authentication: None

Parameters:
Param	Type	Description
id	string	Project UUID
Response (200):

{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "category": "string",
  "owner": "0x...",
  "tokenAddress": "0x...",
  "escrowAddress": "0x...",
  "nftTokenId": "number",
  "fundingGoal": 1000000,
  "fundingRaised": 500000,
  "tokenPrice": 1.00,
  "totalSupply": 1000000,
  "milestones": [...],
  "documents": [...],
  "status": "active",
  "createdAt": "2026-03-06T12:00:00Z"
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/projects/create
Create project (internal use after deployment).
Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "applicationId": "uuid",
  "tokenAddress": "0x...",
  "escrowAddress": "0x...",
  "projectId": "number",
  "nftTokenId": "number",
  "metadataUri": "ipfs://..."
}
Response (201):

{
  "success": true,
  "project": { ... }
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/admin/projects/[id]/activate
Activate a project.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Response (200):

{
  "success": true
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/admin/projects/[id]/cancel
Cancel a project.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "reason": "string"
}
Response (200):

{
  "success": true
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/admin/projects/[id]/refund
Initiate project refund.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Response (200):

{
  "success": true,
  "refundTxHash": "0x..."
}
# ---------------------------------------------------------------------------------------------------------
6. IPFS / File Upload
# ---------------------------------------------------------------------------------------------------------
# POST /api/ipfs/upload
Upload file to IPFS.
Authentication: Required

Headers:
Content-Type: multipart/form-data
Request Body:

file: File
type: "logo" | "banner" | "pitchDeck" | "document" | "image"
Response (200):

{
  "success": true,
  "url": "ipfs://Qm...",
  "hash": "Qm...",
  "size": 12345,
  "gateway": "https://gateway.pinata.cloud/ipfs/Qm..."
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/ipfs/upload-file
Upload document file to IPFS.
Authentication: Required

Headers:
Content-Type: multipart/form-data
Request Body:

file: File
Response (200):

{
  "success": true,
  "url": "ipfs://Qm...",
  "name": "document.pdf",
  "size": 12345,
  "mimeType": "application/pdf"
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/upload
General file upload.
Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: multipart/form-data
Request Body:

file: File
purpose: "kyc" | "project" | "document"
Response (200):

{
  "success": true,
  "url": "string",
  "fileId": "uuid"
}
# ---------------------------------------------------------------------------------------------------------
7. Notifications
# ---------------------------------------------------------------------------------------------------------
# GET /api/notifications
Get user notifications.
Authentication: Required

Headers:
x-wallet-address: string (required)
Query Parameters:
Param	Type	Description
unreadOnly	boolean	Filter unread only
page	number	Page number
limit	number	Items per page
Response (200):

{
  "notifications": [
    {
      "id": "uuid",
      "type": "kyc_approved | project_funded | milestone_released",
      "title": "string",
      "message": "string",
      "read": false,
      "createdAt": "2026-03-06T12:00:00Z"
    }
  ],
  "unreadCount": 5
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/notifications/send
Send notification (Admin/System).
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "targetAddress": "0x...",
  "type": "string",
  "title": "string",
  "message": "string",
  "sendEmail": true
}
Response (200):

{
  "success": true,
  "notificationId": "uuid"
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/notifications/preferences
Get notification preferences.
Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "email": true,
  "push": false,
  "types": {
    "kyc_updates": true,
    "project_updates": true,
    "investment_updates": true,
    "marketing": false
  }
}
# ---------------------------------------------------------------------------------------------------------
# PUT /api/notifications/preferences
Update notification preferences.
Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "email": true,
  "types": {
    "marketing": true
  }
}
Response (200):

{
  "success": true
}
# ---------------------------------------------------------------------------------------------------------
8. Currency & Exchange Rates
# ---------------------------------------------------------------------------------------------------------
# GET /api/currency/rates
Get current exchange rates.

Authentication: None

Query Parameters:
Param	Type	Description
base	string	Base currency (default: USD)
currencies	string	Comma-separated list
Response (200):

{
  "base": "USD",
  "timestamp": "2026-03-06T12:00:00Z",
  "rates": {
    "EUR": 0.92,
    "BRL": 5.05,
    "GBP": 0.79
  }
}
# ---------------------------------------------------------------------------------------------------------
9. Exchange (Trading)
# ---------------------------------------------------------------------------------------------------------
# GET /api/exchange/pairs
Get available trading pairs.

Authentication: None

Response (200):

{
  "pairs": [
    {
      "symbol": "RWA/USDC",
      "baseAsset": "RWA",
      "quoteAsset": "USDC",
      "minQuantity": "10",
      "maxQuantity": "1000000"
    }
  ]
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/exchange/ticker
Get ticker information.

Authentication: None

Query Parameters:
Param	Type	Description
symbol	string	Trading pair symbol
Response (200):

{
  "symbol": "RWA/USDC",
  "price": "1.05",
  "change24h": "2.5",
  "high24h": "1.10",
  "low24h": "1.00",
  "volume24h": "150000"
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/exchange/orderbook
Get order book.

Authentication: None

Query Parameters:
Param	Type	Description
symbol	string	Trading pair symbol
depth	number	Order book depth
Response (200):

{
  "symbol": "RWA/USDC",
  "bids": [
    ["1.04", "5000"],
    ["1.03", "10000"]
  ],
  "asks": [
    ["1.05", "3000"],
    ["1.06", "8000"]
  ],
  "timestamp": "2026-03-06T12:00:00Z"
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/exchange/balance
Get user balances.
Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "balances": [
    {
      "asset": "USDC",
      "free": "10000",
      "locked": "500"
    },
    {
      "asset": "RWA",
      "free": "5000",
      "locked": "0"
    }
  ]
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/exchange/trade
Execute trade.
Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "symbol": "RWA/USDC",
  "side": "buy | sell",
  "type": "market | limit",
  "quantity": "1000",
  "price": "1.05"
}
Response (200):

{
  "success": true,
  "orderId": "uuid",
  "status": "filled | partial | pending",
  "executedQty": "1000",
  "executedPrice": "1.05"
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/exchange/orders
Get user orders.
Authentication: Required

Headers:
x-wallet-address: string (required)
Query Parameters:
Param	Type	Description
symbol	string	Filter by symbol
status	string	Filter by status
Response (200):

{
  "orders": [
    {
      "orderId": "uuid",
      "symbol": "RWA/USDC",
      "side": "buy",
      "type": "limit",
      "quantity": "1000",
      "price": "1.05",
      "status": "filled",
      "createdAt": "2026-03-06T12:00:00Z"
    }
  ]
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/exchange/trades
Get user trade history.
Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "trades": [
    {
      "tradeId": "uuid",
      "orderId": "uuid",
      "symbol": "RWA/USDC",
      "side": "buy",
      "quantity": "1000",
      "price": "1.05",
      "fee": "1.05",
      "feeCurrency": "USDC",
      "timestamp": "2026-03-06T12:00:00Z"
    }
  ]
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/exchange/history
Get exchange history.
Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "history": [
    {
      "type": "deposit | withdraw | trade",
      "asset": "USDC",
      "amount": "1000",
      "status": "completed",
      "txHash": "0x...",
      "timestamp": "2026-03-06T12:00:00Z"
    }
  ]
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/exchange/deposit
Record deposit.
Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "asset": "USDC",
  "amount": "1000",
  "txHash": "0x..."
}
Response (200):

{
  "success": true,
  "depositId": "uuid"
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/exchange/withdraw
Request withdrawal.
Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "asset": "USDC",
  "amount": "1000",
  "toAddress": "0x..."
}
Response (200):

{
  "success": true,
  "withdrawalId": "uuid",
  "status": "pending"
}
# ---------------------------------------------------------------------------------------------------------
10. P2P Trade
# ---------------------------------------------------------------------------------------------------------
# GET /api/trade/deals
Get user deals.
Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "deals": [
    {
      "id": "uuid",
      "type": "buy | sell",
      "asset": "string",
      "amount": "10000",
      "price": "1.00",
      "counterparty": "0x...",
      "status": "pending | active | completed | disputed",
      "createdAt": "2026-03-06T12:00:00Z"
    }
  ]
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/trade/deals
Create new deal.
Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "type": "buy | sell",
  "asset": "string",
  "amount": "10000",
  "price": "1.00",
  "counterparty": "0x...",
  "terms": "string",
  "milestones": [
    {
      "description": "string",
      "percentage": 50,
      "deadline": "2026-04-06"
    }
  ]
}
Response (201):

{
  "success": true,
  "deal": { ... }
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/trade/deals/[id]
Get deal details.
Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "id": "uuid",
  "type": "buy",
  "asset": "string",
  "amount": "10000",
  "price": "1.00",
  "counterparty": "0x...",
  "status": "active",
  "milestones": [...],
  "messages": [...],
  "documents": [...],
  "createdAt": "2026-03-06T12:00:00Z"
}
# ---------------------------------------------------------------------------------------------------------
# PUT /api/trade/deals/[id]
Update deal.
Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "status": "active | completed | cancelled"
}
Response (200):

{
  "success": true,
  "deal": { ... }
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/trade/deals/documents
Upload deal document.
Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: multipart/form-data
Request Body:

dealId: string
file: File
type: "contract | proof | other"
Response (200):

{
  "success": true,
  "document": {
    "id": "uuid",
    "name": "string",
    "url": "string"
  }
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/trade/messages
Send deal message.
Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "dealId": "uuid",
  "message": "string"
}
Response (200):

{
  "success": true,
  "messageId": "uuid"
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/trade/messages
Get deal messages.
Authentication: Required

Headers:
x-wallet-address: string (required)
Query Parameters:
Param	Type	Description
dealId	string	Deal UUID
Response (200):

{
  "messages": [
    {
      "id": "uuid",
      "from": "0x...",
      "message": "string",
      "createdAt": "2026-03-06T12:00:00Z"
    }
  ]
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/trade/milestones/[id]/approve
Approve milestone.
Authentication: Required

Headers:
x-wallet-address: string (required)
Response (200):

{
  "success": true,
  "milestone": {
    "id": "uuid",
    "status": "approved",
    "approvedAt": "2026-03-06T12:00:00Z"
  }
}
# ---------------------------------------------------------------------------------------------------------
11. Admin Trade Management
# ---------------------------------------------------------------------------------------------------------
# GET /api/admin/trade/deals
Get all deals (Admin).
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Response (200):

{
  "deals": [...],
  "total": 100
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/admin/trade/stats
Get trade statistics.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Response (200):

{
  "totalDeals": 500,
  "activeDeals": 50,
  "completedDeals": 400,
  "disputedDeals": 10,
  "totalVolume": 5000000
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/admin/trade/disputes
Get disputed deals.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Response (200):

{
  "disputes": [
    {
      "dealId": "uuid",
      "buyer": "0x...",
      "seller": "0x...",
      "reason": "string",
      "status": "open | resolved",
      "createdAt": "2026-03-06T12:00:00Z"
    }
  ]
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/admin/trade/disputes/stats
Get dispute statistics.
Authentication: Required (Admin)

Headers:
x-wallet-address: string (required)
Response (200):

{
  "total": 50,
  "open": 10,
  "resolved": 40,
  "avgResolutionTime": "48h"
}
# ---------------------------------------------------------------------------------------------------------
12. Payments
# ---------------------------------------------------------------------------------------------------------
# POST /api/payments/stripe/create-intent
Create Stripe payment intent.
Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "amount": 750,
  "currency": "usd",
  "applicationId": "uuid"
}
Response (200):

{
  "clientSecret": "pi_..._secret_...",
  "paymentIntentId": "pi_..."
}
# ---------------------------------------------------------------------------------------------------------
# POST /api/payments/stripe/webhook
Stripe webhook handler.

Authentication: Stripe signature

Headers:
stripe-signature: string
Response (200):

{
  "received": true
}
# ---------------------------------------------------------------------------------------------------------
13. Contract Verification
# ---------------------------------------------------------------------------------------------------------
# POST /api/verify-contract
Verify deployed contract.
Authentication: Required

Headers:
x-wallet-address: string (required)
Content-Type: application/json
Request Body:

{
  "contractAddress": "0x...",
  "chainId": 25,
  "contractName": "RWASecurityToken",
  "constructorArgs": [...]
}
Response (200):

{
  "success": true,
  "verified": true,
  "explorerUrl": "https://..."
}
# ---------------------------------------------------------------------------------------------------------
14. Cron Jobs
# ---------------------------------------------------------------------------------------------------------
# GET /api/cron/deadlines
Check deadline reminders (system).

Authentication: Cron secret

Headers:
authorization: Bearer CRON_SECRET
Response (200):

{
  "processed": 15,
  "reminders_sent": 5
}
# ---------------------------------------------------------------------------------------------------------
# GET /api/cron/digest
Send daily digest (system).

Authentication: Cron secret

Headers:
authorization: Bearer CRON_SECRET
Response (200):

{
  "processed": 100,
  "emails_sent": 85
}
Error Response Format
All errors follow this structure:

{
  "error": "Error message description",
  "code": "ERROR_CODE (optional)",
  "details": {} 
}
# ---------------------------------------------------------------------------------------------------------
# HTTP Status Codes
# ---------------------------------------------------------------------------------------------------------
Code    Description
200	    Success
201	    Created
400	    Bad Request
401	    Unauthorized
403	    Forbidden
404	    Not Found
409	    Conflict
422	    Unprocessable Entity
429	    Too Many Requests
500	    Internal Server Error
# ---------------------------------------------------------------------------------------------------------
# Rate Limits
# ---------------------------------------------------------------------------------------------------------
Endpoint        Type	    Limit
Public          endpoints	100 requests/minute
Authenticated   endpoints	300 requests/minute
Admin           endpoints	500 requests/minute
Upload          endpoints	20 requests/minute

API Versioning
Current version: v1 (implicit)