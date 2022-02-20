use crate::error::EscrowError;
use solana_program::{
	instruction::{AccountMeta, Instruction},
	program_error::ProgramError,
	program_pack::Pack,
	pubkey::Pubkey,
	msg,
};
use std::convert::TryInto;


///Init struct
#[repr(C)]
#[derive(Debug, PartialEq)]
pub struct Initialize {
	///price of NFT
	pub price: u64,
	///stake for NFT
	pub stake: u64,
	///Nonce
	pub nonce: u8,
	/// number of assigned creators to NFT
	pub creator_count: u8,
	/// seller_fee
	pub seller_fee: u16,
	/// creator_percentage
	pub creator_percentage: [u8; 5],
}
///Init struct
#[repr(C)]
#[derive(Debug, PartialEq)]
pub struct Buy {
	/// Buyer nonce
	pub nonce: u8
}

///Init struct
#[repr(C)]
#[derive(Debug, PartialEq)]
pub struct Stake {
	/// Stake amount
	pub amount: u64,
}

///Init struct
#[repr(C)]
#[derive(Debug, PartialEq)]
pub struct Unstake {
	/// Stake amount
	pub amount: u64,
}

///All supported instructions
#[repr(C)]
#[derive(Debug, PartialEq)]
pub enum EscrowInstruction {
	///0
	/// Init Escrow
	/// 
	/// Accounts expected by this instruction:
	/// 
	/// 	0: `[writable]` Escrow account
	/// 	1: `[]` Authority account - authority needed for delist/purchase
	/// 	2: `[]` Nft mint account
	/// 	3: `[]` Seller's NFT Token account
	/// 	4: `[writable]` Program NFT Token account - account where nft is stored
	/// 																Authority can transfer this token
	/// 	5: `[]` Seller token account - used when listing currency is not SOL
	/// 	6: `[]` Platform fee account
	/// 	7: `[]` Currency mint - if price is in SOLs then system program id is sent
	/// 	8: `[signer]` User wallet
	/// 	9: `[writable]` AART Token account - Used for staking aart with NFT, 
	/// 																				if nothing is staked, system program id is sent
	/// 	10: `[writable]` Program AART Token account - account where AARTs are stored
	/// 	11: `[]` Token program id
	/// 	Optional:
	/// 	12-16: Royalty split accounts
	Initialize(Initialize),
	///1
	/// Delist NFT
	/// 
	/// Accounts expected by this instruction:
	/// 
	/// 	1: `[writable]` Escrow account
	/// 	2: `[writable]` Authority account - Authority needed for transfering NFT
	/// 	3: `[signer]` Wallet account
	/// 	4: `[writable]` Seller's NFT Token account - NFT is trasfered to this account
	/// 	5: `[writable]` Program's NFT Token account - NFT is stored on this account
	/// 	6: `[writable]` User AART Token account - AARTs are transfered to this account,
	/// 																						if any were staked on listing
	/// 	7: `[writable]` Program AART Token account - AARTs are transfered from this account,
	/// 																						if any were staked on listing
	/// 	8: `[]` Stake authority - Authority needed for unstaking AART
	/// 	9: `[]` Token program id
	Delist(),

	///2
	/// Buy NFT
	/// 
	/// Accounts expected by this instruction:
	/// 
	/// 	1: `[writable]` Escrow account
	/// 	2: `[writable]` Authority account - Authority needed for transfering NFT (same as 4.)
	/// 	3: `[signer, writable]` Buyer's account
	/// 	4: `[writable]` Authority account - Authority needed for transfering NFT
	/// 	5: `[]` Source account - From this account price tokens are transfered 
	/// 														(can be SOL or other Mint, depending on currency_mint in escrow data)
	/// 	6: `[writable]` Seller account - Price is transfered to this account (same as 5.)
	/// 	7: `[writable]` Buyer's NFT Token account
	/// 	8: `[]` Platform fee account
	/// 	9: `[writable]` Program's NFT Token account
	/// 	10: `[writable]` Seller AART Token account - Account where staked AART Tokens are returned.
	/// 	11: `[writable]` Program AART Token account - Account where staked AART Tokens were stored.  
	/// 	12: `[writable]` Stake authority - Authority needed for transfering AART
	/// 	13: `[writable]` Seller wallet account
	/// 	14: `[]` Platform staked AART Token account - Account used for fee reduction, 
	/// 																								if seller has no staked AART, then system program id is sent
	/// 	15: `[]` Token program id
	/// 	16: `[]` System program id
	/// 	Optional:
	/// 	16-20: Royalty split accounts
	Buy(Buy),
	///3
	/// Stake AART for fee reduction on solsea
	/// 
	/// Accounts expected by this instruction:
	/// 
	/// 1: `[signer]` Wallet account
	/// 2: `[writable]` Authority account
	/// 3: `[]` AART Mint account
	/// 4: `[writable]` User AART Token account
	/// 5: `[writable]` Program AART Token account - initialized / uninitialized supported
	/// 6: `[]` Token program id
	/// 7: `[]` System program id
	/// 8: `[]` Rent sysvar.
	Stake(Stake),
	///4
	/// Unstake AART
	/// 
	/// Accounts expected by this instruction:
	/// 
	/// 1: `[signer, writable]` Wallet account
	/// 2: `[writable]` Authority account
	/// 3: `[]` AART Mint account
	/// 4: `[writable]` User AART Token account
	/// 5: `[writable]` Program AART Token account
	/// 6: `[]` Token program id
	/// 7: `[]` System program id
	/// 8: `[]` Rent sysvar.
	Unstake(Unstake)
}

impl EscrowInstruction {
	///Unpack, matches which instruction is called
	pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
		let (&tag, rest) = input.split_first().ok_or(EscrowError::InvalidInstruction)?;
		Ok(match tag {
			0 => {
				let (price, rest) = Self::unpack_u64(rest)?;
				let (stake, rest) = Self::unpack_u64(rest)?;
				let (&nonce, rest) = rest.split_first().ok_or(EscrowError::InvalidInstruction)?;
				let (&creator_count, rest) = rest.split_first().ok_or(EscrowError::InvalidInstruction)?;
				// let (&seller_fee, rest) = rest.split_first().ok_or(EscrowError::InvalidInstruction)?;
				let (seller_fee, rest) = Self::unpack_u16(rest)?;
				let mut creator_percentage: [u8; 5] = [0, 0, 0, 0, 0];
				let mut bytes = rest;
				for n in 0..5 {
					let (&count, rest) = bytes.split_first().ok_or(EscrowError::InvalidInstruction)?;
					creator_percentage[n] = count;	
					bytes = rest;
				}

				Self::Initialize(Initialize {
					price,
					stake,
					nonce,
					creator_count,
					creator_percentage,
					seller_fee
				})
			}
			1 => {
				Self::Delist()
			}
			2 => {
				let (&nonce, rest) = rest.split_first().ok_or(EscrowError::InvalidInstruction)?;
				Self::Buy(Buy {
					nonce
				})
			}
			3 => {
				let (amount, rest) = Self::unpack_u64(rest)?; 
				Self::Stake(Stake {
					amount
				})
			}
			4 => {
				let (amount, rest) = Self::unpack_u64(rest)?;
				Self::Unstake(Unstake{
					amount
				})
			}
			_ => return Err(EscrowError::InvalidInstruction.into()),
		})
	}

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

}