use crate::{
	error::EscrowError
};
use solana_program::{
	pubkey::Pubkey,
	program_pack::{Pack, Sealed},
	program_error::ProgramError,
	msg,
};
use arrayref::{array_mut_ref, array_ref, array_refs, mut_array_refs};
use std::convert::TryInto;

/// Prefix for staking AART
pub const STAKE_PREFIX: &str = "aartstake3";
/// Prefix for staking authotiy
pub const STAKE_AUTHORITY_PREFIX: &str = "stakeauthority3";

/// Program states.
#[repr(C)]
#[derive(Debug, Default, PartialEq)]
pub struct EscrowStateV2 {
	/// Escrow version
	/// 1 -> Stake version
	// pub version: u8,
	/// Escrow state
	/// 0 => Listed
	/// 1 => Delisted
	/// 2 => Bought
	pub state: u8,

	/// Nonce used in program address
	pub nonce: u8,

	/// Sell price
	pub price: u64,

	/// Staked amount
	pub stake_amount: u64,

	/// NFT Mint
	pub mint: Pubkey,

	/// Account where tokens are transfered when NFT is bought
	pub wallet: Pubkey,

	/// Seller's account from where NFT came to Escrow
	pub seller_nft_account: Pubkey,

	/// Account where tokens are transfered when NFT is bought
	pub seller_token_account: Pubkey,

	/// Program NFT account.
	/// NFT stays on this account, while Escrow is active
	pub program_nft_account: Pubkey,

	/// Mint for currency, if currency is SOL, key is system program id
	pub currency_mint: Pubkey,

	/// Account for authority
	pub authority_account: Pubkey,

	/// Buyer 
	pub buyer: Pubkey,

	/// 
	pub creator_count: u8,

	///
	pub creator_percentage: [u8; 5],

	///
	pub seller_fee: u16,

	/// NFT creators
	pub creators: Vec<Pubkey>,

	// /// Owners stake account
	// pub stake_account: Pubkey,
	
	
	/// Program stake account
	/// AART tokens stay on this account, while Escrow is active
	pub program_stake_account: Pubkey,

}

impl EscrowStateV2 {
	fn unpack_u64(input: &[u8]) -> Result<(u64, &[u8]), ProgramError> {
		if input.len() >= 8 {
				let (amount, rest) = input.split_at(8);
				let amount = amount
						.get(..8)
						.and_then(|slice| slice.try_into().ok())
						.map(u64::from_le_bytes)
						.ok_or(EscrowError::InvalidInstruction)?;
				Ok((amount, rest))
		} else {
				Err(EscrowError::InvalidInstruction.into())
		}
	}
	fn unpack_u16(input: &[u8]) -> Result<(u16, &[u8]), ProgramError> {
		if input.len() >= 2 {
			let (amount, rest) = input.split_at(2);
			let amount = amount.get(..2).and_then(|slice| slice.try_into().ok()).map(u16::from_le_bytes).ok_or(EscrowError::InvalidInstruction)?;
			Ok((amount, rest))
		} else {
			Err(EscrowError::InvalidInstruction.into())
		}
	}

	fn set_u16_le(a: &mut [u8], v: u16) {
    a[0] = v as u8;
    a[1] = (v >> 8) as u8;
	}
}
impl Sealed for EscrowStateV2 {}

impl Pack for EscrowStateV2 {
	const LEN: usize = 402;

	fn pack_into_slice(&self, output: &mut [u8]) {
		let output = array_mut_ref![output, 0, 474];
		let (
			state,
			nonce,
			price,
			stake_amount,
			mint,
			seller_nft_account,
			wallet,
			program_nft_account,
			currency_mint,
			authority_account,
			creator_count,
			seller_fee,
			creator_percentage,
			creators,
			seller_token_account,
			buyer_account,
			program_stake_account,
		) = mut_array_refs![output, 1, 1, 8, 8, 32, 32, 32, 32, 32, 32, 1, 2, 5, 160, 32, 32, 32];

		nonce[0] = self.nonce;
		state[0] = self.state;
		price.copy_from_slice(self.price.to_le_bytes().as_ref());
		stake_amount.copy_from_slice(self.stake_amount.to_le_bytes().as_ref());
		mint.copy_from_slice(self.mint.as_ref());
		seller_nft_account.copy_from_slice(self.seller_nft_account.as_ref());
		seller_token_account.copy_from_slice(self.seller_token_account.as_ref());
		wallet.copy_from_slice(self.wallet.as_ref());
		program_nft_account.copy_from_slice(self.program_nft_account.as_ref());
		currency_mint.copy_from_slice(self.currency_mint.as_ref());
		authority_account.copy_from_slice(self.authority_account.as_ref());
		creator_count[0] = self.creator_count;
		seller_fee.copy_from_slice(self.seller_fee.to_le_bytes().as_ref());
		creator_percentage.copy_from_slice(self.creator_percentage.as_ref());
		for i in 0..5 {
			let bytes = self.creators[i].to_bytes();
			creators[i*32..i*32+32].copy_from_slice(&bytes);
		}

		buyer_account.copy_from_slice(self.buyer.as_ref());
		program_stake_account.copy_from_slice(self.program_stake_account.as_ref());
	}

	fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
		let input = array_ref![src, 0, 474];
		let (
			state,
			nonce,
			price,
			stake_amount,
			mint,
			seller_nft_account,
			wallet,
			program_nft_account,
			currency_mint,
			authority_account,
			creator_count,
			seller_fee,
			creator_percentage,
			creators,
			seller_token_account,
			buyer_account,
			program_stake_account,
		) = array_refs![input, 1, 1, 8, 8, 32, 32, 32, 32, 32, 32, 1, 2, 5, 160, 32, 32, 32];
		let (price, rest) = Self::unpack_u64(price)?;
		let (stake_amount, rest) = Self::unpack_u64(stake_amount)?;
		let mut vec_creators: Vec<Pubkey> = Vec::new();
		
		for i in 0..5 {
			let mut tmp = [0u8; 32];
			tmp.copy_from_slice(&creators[i * 32..i * 32 + 32]);
			vec_creators.push(Pubkey::new_from_array(tmp));
		}

		msg!("vec creators {:?}", vec_creators);
		
		Ok(Self {
			state: state[0],
			price,
			stake_amount,
			nonce: nonce[0],
			mint: Pubkey::new_from_array(*mint),
			seller_nft_account: Pubkey::new_from_array(*seller_nft_account),
			seller_token_account: Pubkey::new_from_array(*seller_token_account),
			program_nft_account: Pubkey::new_from_array(*program_nft_account),
			currency_mint: Pubkey::new_from_array(*currency_mint),
			authority_account: Pubkey::new_from_array(*authority_account),
			seller_fee: ((seller_fee[1] as u16) << 8) | seller_fee[0] as u16,
			creator_count: creator_count[0],
			creator_percentage: *creator_percentage,
			creators: vec_creators,
			wallet: Pubkey::new_from_array(*wallet),
			buyer: Pubkey::new_from_array(*buyer_account),
			// stake_account: Pubkey::new_from_array(*stake_account),
			// stake_amount,
			program_stake_account: Pubkey::new_from_array(*program_stake_account),
		})
	}
}