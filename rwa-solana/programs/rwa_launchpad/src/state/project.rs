// programs/rwa_launchpad/src/state/project.rs
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum ProjectStatus {
    #[default]
    Draft = 0,
    PendingVerification = 1,
    Active = 2,
    Funded = 3,
    InProgress = 4,
    Completed = 5,
    Disputed = 6,
    Cancelled = 7,
}

#[account]
pub struct Project {
    /// Project ID
    pub project_id: u64,
    /// Project owner
    pub owner: Pubkey,
    /// Project name (max 64 chars)
    pub name: [u8; 64],
    pub name_len: u8,
    /// Description hash (IPFS)
    pub description_hash: [u8; 64],
    /// Funding goal in lamports (or token base units)
    pub funding_goal: u64,
    /// Total raised
    pub total_raised: u64,
    /// Funding deadline (Unix timestamp)
    pub funding_deadline: i64,
    /// Project status
    pub status: ProjectStatus,
    /// Legal contract hash (IPFS)
    pub legal_contract_hash: [u8; 64],
    /// Jurisdiction code
    pub jurisdiction: [u8; 8],
    /// Security token mint
    pub security_token_mint: Pubkey,
    /// Escrow account
    pub escrow_account: Pubkey,
    /// Metadata URI
    pub metadata_uri: [u8; 128],
    pub metadata_uri_len: u8,
    /// Created at timestamp
    pub created_at: i64,
    /// Verified at timestamp
    pub verified_at: i64,
    /// Verifier
    pub verifier: Pubkey,
    /// Milestone count
    pub milestone_count: u8,
    /// Completed milestones
    pub completed_milestones: u8,
    /// Is disputed
    pub is_disputed: bool,
    /// Investor count
    pub investor_count: u32,
    /// Bump seed
    pub bump: u8,
}

impl Project {
    pub const LEN: usize = 8 +   // discriminator
        8 +                      // project_id
        32 +                     // owner
        64 + 1 +                 // name + len
        64 +                     // description_hash
        8 +                      // funding_goal
        8 +                      // total_raised
        8 +                      // funding_deadline
        1 +                      // status
        64 +                     // legal_contract_hash
        8 +                      // jurisdiction
        32 +                     // security_token_mint
        32 +                     // escrow_account
        128 + 1 +                // metadata_uri + len
        8 +                      // created_at
        8 +                      // verified_at
        32 +                     // verifier
        1 +                      // milestone_count
        1 +                      // completed_milestones
        1 +                      // is_disputed
        4 +                      // investor_count
        1;                       // bump

    pub fn get_name(&self) -> String {
        String::from_utf8_lossy(&self.name[..self.name_len as usize]).to_string()
    }

    pub fn set_name(&mut self, name: &str) {
        let bytes = name.as_bytes();
        let len = bytes.len().min(64);
        self.name[..len].copy_from_slice(&bytes[..len]);
        self.name_len = len as u8;
    }
}

#[account]
pub struct Milestone {
    /// Project this milestone belongs to
    pub project: Pubkey,
    /// Milestone index
    pub index: u8,
    /// Description
    pub description: [u8; 128],
    pub description_len: u8,
    /// Amount to release on completion
    pub release_amount: u64,
    /// Deadline
    pub deadline: i64,
    /// Is completed
    pub completed: bool,
    /// Funds released
    pub funds_released: bool,
    /// Completion timestamp
    pub completion_time: i64,
    /// Proof hash (IPFS)
    pub proof_hash: [u8; 64],
    /// Is disputed
    pub is_disputed: bool,
    /// Bump seed
    pub bump: u8,
}

impl Milestone {
    pub const LEN: usize = 8 +   // discriminator
        32 +                     // project
        1 +                      // index
        128 + 1 +                // description + len
        8 +                      // release_amount
        8 +                      // deadline
        1 +                      // completed
        1 +                      // funds_released
        8 +                      // completion_time
        64 +                     // proof_hash
        1 +                      // is_disputed
        1;                       // bump
}
