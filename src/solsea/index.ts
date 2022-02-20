import { seq, struct, u16, u8 } from "@solana/buffer-layout";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
  u64,
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { publicKey, uint64 } from "../layout";
import { vec } from "../layout/borsh";

export const SOLSEA_ESCROW_PROGRAM_ID = new PublicKey(
  "617jbWo616ggkDxvW1Le8pV38XLbVSyWY8ae6QUmGBAU"
);

/// Prefix for staking AART
const STAKE_PREFIX = "aartstake3";
/// Prefix for staking authotiy
const STAKE_AUTHORITY_PREFIX = "stakeauthority3";

interface EscrowState {
  state: number;
  nonce: number;
  price: u64;
  stakeAmount: u64;
  mint: PublicKey;
  sellerNftAccount: PublicKey;
  wallet: PublicKey;
  programNftAccount: PublicKey;
  currencyMint: PublicKey;
  authorityAccount: PublicKey;
  creatorCount: number;
  creatorPercentage: number[];
  sellerFee: number;
  creators: PublicKey[];
  sellerTokenAccount: PublicKey;
  buyer: PublicKey;
  programStakeAccount: PublicKey;
}

export const EscrowStateLayout = struct<EscrowState>([
  u8("state"),
  u8("nonce"),
  uint64("price"),
  uint64("stakeAmount"),
  publicKey("mint"),
  publicKey("sellerNftAccount"),
  publicKey("wallet"),
  publicKey("programNftAccount"),
  publicKey("currencyMint"),
  publicKey("authorityAccount"),
  u8("creatorCount"),
  u16("sellerFee"),
  seq(u8(), 5, "creatorPercentage"),
  //vec(publicKey("x"), "creators"),
  publicKey("sellerTokenAccount"),
  publicKey("buyer"),
  publicKey("programStakeAccount"),
]);

async function createBuyInstruction(
  escrow: PublicKey,
  escrowState: EscrowState,
  buyer: PublicKey,
  buyerNftTokenAccount: PublicKey
): Promise<TransactionInstruction> {
  const [authority] = await PublicKey.findProgramAddress(
    [escrow.toBuffer()],
    SOLSEA_ESCROW_PROGRAM_ID
  );

  const source = buyer; // This might not be true when currencyMint isn't SOL

  const seller = escrowState.wallet;
  const sellerWalletAccount = escrowState.sellerTokenAccount;

  const platformFeeAccount = escrowState.authorityAccount;

  // Assume not Aart treatment
  const sellerAartTokenAccount = SystemProgram.programId;
  const programAartTokenAccount = SystemProgram.programId;
  const stakeAuthority = SystemProgram.programId;
  const platformStakedAartTokenAccount = SystemProgram.programId;

  const keys = [
    { pubkey: escrow, isWritable: true, isSigner: false },
    { pubkey: authority, isWritable: true, isSigner: false },
    { pubkey: buyer, isWritable: true, isSigner: true },
    { pubkey: authority, isWritable: true, isSigner: false },
    { pubkey: source, isWritable: true, isSigner: false },
    { pubkey: seller, isWritable: true, isSigner: false },
    { pubkey: buyerNftTokenAccount, isWritable: true, isSigner: false },
    { pubkey: platformFeeAccount, isWritable: true, isSigner: false },
    {
      pubkey: escrowState.programNftAccount,
      isWritable: true,
      isSigner: false,
    },
    { pubkey: sellerAartTokenAccount, isWritable: true, isSigner: false },
    { pubkey: programAartTokenAccount, isWritable: true, isSigner: false },
    { pubkey: stakeAuthority, isWritable: true, isSigner: false },
    { pubkey: sellerWalletAccount, isWritable: true, isSigner: false },
    {
      pubkey: platformStakedAartTokenAccount,
      isWritable: true,
      isSigner: false,
    },

    { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
    { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
    // Then optional: Royalty split accounts
    // {pubkey: SystemProgram.programId, isWritable: false, isSigner: false},
  ];

  return {
    programId: SOLSEA_ESCROW_PROGRAM_ID,
    keys,
    data: Buffer.from([2, escrowState.nonce]),
  };
}

// buy tx as an example https://explorer.solana.com/tx/5eE2FRxuKxWP2izYRddYcrLGXNMzXLKRD8DAvcSkRWnynsdpcp1f7fVkAVXi5P6ZbPeZYjoZJi2K7Abp1sQWMLaB
export async function createBuyTransaction(
  escrow: PublicKey,
  escrowState: EscrowState,
  buyer: PublicKey
) {
  const buyerAta = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    escrowState.mint,
    buyer
  );
  const ixs = [
    Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      escrowState.mint,
      buyerAta,
      buyer,
      buyer
    ),
    await createBuyInstruction(escrow, escrowState, buyerAta, buyer),
  ];
  return new Transaction({ feePayer: buyer }).add(...ixs);
}
