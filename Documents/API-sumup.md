### Complete API Overview
	Category	    Endpoint	                            Method	Auth	Description
# HEALTH					
1	Health	        /api/health	                            GET	    No	    Check API status
# TOKENIZATION					
2	Tokenization	/api/tokenization/apply	                POST	Yes	    Submit application
3	Tokenization	/api/tokenization/apply	                GET	    Yes	    Get user applications
4	Tokenization	/api/tokenization/[id]	                GET	    Yes	    Get application details
5	Tokenization	/api/tokenization/[id]/resubmit	        PUT	    Yes	    Resubmit rejected app
6	Tokenization	/api/tokenization/[id]/pay	            POST	Yes	    Record payment
7	Tokenization	/api/tokenization/[id]/deploy	        POST	Yes	    Record deployment
8	Tokenization	/api/tokenization/[id]/cancel	        POST	Yes	    Cancel application
# KYC - STATUS					
9	KYC	            /api/kyc/status/[address]	            GET	    No	    Get KYC status by address
10	KYC	            /api/kyc/status	                        GET	    Yes	    Get own KYC status
11	KYC	            /api/kyc/limits	                        GET	    No	    Get tier limits
12	KYC	            /api/kyc/level	                        GET	    Yes	    Get detailed level info
13	KYC	            /api/kyc/fee	                        GET	    No	    Get KYC fee
14	KYC	            /api/kyc/countries	                    GET	    No	    Get supported countries
# KYC - SUBMISSION					
15	KYC	            /api/kyc/submit	                        POST	Yes	    Submit KYC application
16	KYC	            /api/kyc/upload	                        POST	Yes	    Upload KYC document
17	KYC	            /api/kyc/confirm-payment	            POST	Yes	    Confirm KYC fee payment
18	KYC	            /api/kyc/documents/[address]	        GET	    Yes	    Get uploaded documents
19	KYC	            /api/kyc/email/[address]	            GET	    Admin	Get KYC email
# KYC - VERIFICATION					
20	KYC	            /api/kyc/liveness-session	            POST	Yes	    Create liveness session
21	KYC	            /api/kyc/liveness-session/[sessionId]	GET	    Yes	    Get liveness status
22	KYC	            /api/kyc/verify-document	            POST	Admin	Verify document
23	KYC	            /api/kyc/generate-proof	                POST	Yes	    Generate on-chain proof
24	KYC	            /api/kyc/proof	                        GET	    Yes	    Get existing proof
25	KYC	            /api/kyc/pending-upgrades	            GET	    Admin	Get pending upgrades
# KYC - WALLET LINKING					
26	KYC	            /api/kyc/link/generate	                POST	Yes	    Generate link code
27	KYC	            /api/kyc/link/use	                    POST	Yes	    Use link code
28	KYC	            /api/kyc/link/list	                    GET	    Yes	    Get linked wallets
# KYC - GDPR					
29	KYC	            /api/kyc/gdpr/export	                POST	Yes	    Export user data
30	KYC	            /api/kyc/gdpr/delete	                DELETE	Yes	    Delete user data
31	KYC	            /api/kyc/reset/[address]	            DELETE	Admin	Reset KYC
# ADMIN - GENERAL					
32	Admin	        /api/admin/check	                    GET	    Yes	    Check if admin
33	Admin	        /api/admin/list	                        GET	    No	    Get admin list
34	Admin	        /api/admin/role	                        GET	    Yes	    Get admin role
35	Admin	        /api/admin/promote	                    POST	Super	Promote to admin
36	Admin	        /api/admin/demote	                    POST	Super	Remove admin
37	Admin	        /api/admin/activity	                    GET	    Admin	Get activity log
# ADMIN - TOKENIZATION					
38	Admin	        /api/admin/tokenizations	            GET	    Admin	Get all applications
39	Admin	        /api/admin/tokenizations	            PATCH	Admin	Update application
40	Admin	        /api/admin/tokenization/stats	        GET	    Admin	Get statistics
# ADMIN - KYC					
41	Admin	        /api/admin/kyc/applications	            GET	    Admin	Get KYC applications
42	Admin	        /api/admin/kyc/approve	                POST	Admin	Approve KYC
43	Admin	        /api/admin/kyc/reject	                POST	Admin	Reject KYC
44	Admin	        /api/admin/kyc/stats	                GET	    Admin	Get KYC stats
45	Admin	        /api/admin/kyc/settings	                GET	    Admin	Get KYC settings
46	Admin	        /api/admin/kyc/settings	                PUT	    Admin	Update KYC settings
47	Admin	        /api/admin/kyc/document/[id]	        GET	    Admin	Get KYC document
# ADMIN - SETTINGS					
48	Admin	        /api/admin/settings/fee	                GET	    Admin	Get fee settings
49	Admin	        /api/admin/settings/fee	                PUT	    Admin	Update fees
50	Admin	        /api/admin/email/test	                POST	Admin	Send test email
# ADMIN - PROJECTS					
51	Admin	        /api/admin/projects/[id]/activate	    POST	Admin	Activate project
52	Admin	        /api/admin/projects/[id]/cancel	        POST	Admin	Cancel project
53	Admin	        /api/admin/projects/[id]/refund	        POST	Admin	Initiate refund
# PROJECTS					
54	Projects	    /api/projects/list	                    GET	    No	    Get all projects
55	Projects	    /api/projects/[id]	                    GET	    No	    Get project details
56	Projects	    /api/projects/create	                POST	Yes	    Create project
# FILE UPLOAD					
57	Upload	        /api/ipfs/upload	                    POST	Yes	    Upload to IPFS
58	Upload	        /api/ipfs/upload-file	                POST	Yes	    Upload document to IPFS
59	Upload	        /api/upload	                            POST	Yes	    General file upload
# NOTIFICATIONS					
60	Notifications	/api/notifications	                    GET	    Yes	    Get notifications
61	Notifications	/api/notifications/send	                POST	Admin	Send notification
62	Notifications	/api/notifications/preferences	        GET	    Yes	    Get preferences
63	Notifications	/api/notifications/preferences	        PUT	    Yes	    Update preferences
# CURRENCY					
64	Currency	    /api/currency/rates	                    GET	    No	    Get exchange rates
# EXCHANGE					
65	Exchange	    /api/exchange/pairs	                    GET	    No	    Get trading pairs
66	Exchange	    /api/exchange/ticker	                GET	    No	    Get ticker info
67	Exchange	    /api/exchange/orderbook	                GET	    No	    Get order book
68	Exchange	    /api/exchange/balance	                GET	    Yes	    Get user balances
69	Exchange	    /api/exchange/trade	                    POST	Yes	    Execute trade
70	Exchange	    /api/exchange/orders	                GET	    Yes	    Get user orders
71	Exchange	    /api/exchange/trades	                GET	    Yes	    Get trade history
72	Exchange	    /api/exchange/history	                GET	    Yes	    Get exchange history
73	Exchange	    /api/exchange/deposit	                POST	Yes	    Record deposit
74	Exchange	    /api/exchange/withdraw	                POST	Yes	    Request withdrawal
# EXCHANGE - MEXC					
75	MEXC	        /api/exchange/mexc/pairs	            GET	    No	    Get MEXC pairs
76	MEXC	        /api/exchange/mexc/ticker	            GET	    No	    Get MEXC ticker
77	MEXC	        /api/exchange/mexc/orderbook	        GET	    No	    Get MEXC orderbook
78	MEXC	        /api/exchange/mexc/trade	            POST	Yes	    Execute MEXC trade
79	MEXC	        /api/exchange/mexc/deposit-address	    GET	    Yes	    Get deposit address
# P2P TRADE					
80	Trade	        /api/trade/deals	                    GET	    Yes	    Get user deals
81	Trade	        /api/trade/deals	                    POST	Yes	    Create new deal
82	Trade	        /api/trade/deals/[id]	                GET	    Yes	    Get deal details
83	Trade	        /api/trade/deals/[id]	                PUT	    Yes	    Update deal
84	Trade	        /api/trade/deals/documents	            POST	Yes	    Upload deal document
85	Trade	        /api/trade/messages	                    GET	    Yes	    Get deal messages
86	Trade	        /api/trade/messages	                    POST	Yes	    Send message
87	Trade	        /api/trade/milestones/[id]/approve	    POST	Yes	    Approve milestone
# ADMIN - TRADE					
88	Admin Trade	    /api/admin/trade/deals	                GET	    Admin	Get all deals
89	Admin Trade	    /api/admin/trade/stats	                GET	    Admin	Get trade stats
90	Admin Trade	    /api/admin/trade/disputes	            GET	    Admin	Get disputes
91	Admin Trade	    /api/admin/trade/disputes/stats	        GET	    Admin	Get dispute stats
# PAYMENTS					
92	Payments	    /api/payments/stripe/create-intent	    POST	Yes	    Create payment intent
93	Payments	    /api/payments/stripe/webhook	        POST	Stripe	Stripe webhook
# VERIFICATION					
94	Verify	        /api/verify-contract	                POST	Yes	    Verify contract
# CRON JOBS					
95	Cron	        /api/cron/deadlines	                    GET	    Cron	Check deadlines
96	Cron	        /api/cron/digest	                    GET	    Cron	Send daily digest
# WEBSOCKET					
97	WebSocket	    /api/ws	                                WS	    Yes	    Real-time updates

### Summary by Category

Category	            Count	Auth    Required
Health	                1	    0
Tokenization	        7	    7
KYC - Status	        6	    3
KYC - Submission	    5	    4
KYC - Verification	    6	    5
KYC - Wallet Linking	3	    3
KYC - GDPR	            3	    3
Admin - General	        6	    5
Admin - Tokenization	3	    3
Admin - KYC	            7	    7
Admin - Settings	    3	    3
Admin - Projects	    3	    3
Projects	            3	    1
File Upload	            3	    3
Notifications	        4	    3
Currency	            1	    0
Exchange	            10	    7
MEXC	                5	    2
P2P Trade	            8	    8
Admin Trade	            4	    4
Payments	            2	    1
Verification	        1	    1
Cron Jobs	            2	    2
WebSocket	            1	    1
TOTAL	                97	    79

# By HTTP Method

Method	Count
GET	    58
POST	33
PUT	    4
PATCH	1
DELETE	2
WS	    1
TOTAL	97

# By Authentication Level

Level	Count	Description
None	18	    Public endpoints
Yes	    62	    Wallet auth required
Admin	24	    Admin wallet required
Super	2	    Super admin only
Cron	2	    Cron secret required
Stripe	1	    Stripe signature

# Visual Flow Chart

┌─────────────────────────────────────────────────────────────────────────────┐
│                              RWA LAUNCHPAD API                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│    PUBLIC     │           │     USER      │           │     ADMIN     │
│  (18 endpoints)│           │ (62 endpoints)│           │ (24 endpoints)│
└───────────────┘           └───────────────┘           └───────────────┘
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ • Health      │           │ • Tokenization│           │ • KYC Mgmt    │
│ • KYC Limits  │           │ • KYC Submit  │           │ • App Review  │
│ • Countries   │           │ • Projects    │           │ • Settings    │
│ • Projects    │           │ • Trading     │           │ • Trade Mgmt  │
│ • Exchange    │           │ • P2P Deals   │           │ • User Mgmt   │
│ • Currency    │           │ • Uploads     │           │ • Analytics   │
└───────────────┘           └───────────────┘           └───────────────┘

# Endpoint Grouping by User Journey

## Creator Journey (Tokenize Asset)

1. POST     /api/kyc/submit                 → Submit KYC
2. POST     /api/kyc/upload                 → Upload documents
3. POST     /api/kyc/confirm-payment        → Pay KYC fee
4. GET      /api/kyc/status                 → Check approval
5. POST     /api/tokenization/apply         → Submit application
6. GET      /api/tokenization/[id]          → Track status
7. POST     /api/tokenization/[id]/pay      → Pay tokenization fee
8. POST     /api/tokenization/[id]/deploy   → Deploy tokens

## Investor Journey (Invest in Project)

1. GET      /api/projects/list              → Browse projects
2. GET      /api/projects/[id]              → View details
3. POST     /api/kyc/submit                 → Complete KYC
4. GET      /api/kyc/limits                 → Check investment limits
5. POST     /api/exchange/trade             → Purchase tokens
6. GET      /api/exchange/balance           → View holdings

## Admin Journey (Manage Platform)

1. GET      /api/admin/check                 → Verify admin status
2. GET      /api/admin/kyc/applications      → Review KYC queue
3. POST     /api/admin/kyc/approve           → Approve KYC
4. GET      /api/admin/tokenizations         → Review applications
5. PATCH    /api/admin/tokenizations         → Approve/reject
6. GET      /api/admin/trade/disputes        → Handle disputes

# Rate Limits by Endpoint Type

Endpoint Type	Rate Limit	Window
Public GET	    100/min	    Per IP
Auth GET	    300/min	    Per wallet
Auth POST	    60/min	    Per wallet
Upload	        20/min	    Per wallet
Admin	        500/min	    Per wallet
Trade	        30/min	    Per wallet