import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { seq, struct, u8 } from "@solana/buffer-layout";
import {
  AccountLayout as TokenAccountLayout,
  TOKEN_PROGRAM_ID,
  u64,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { publicKey, uint64 } from "../layout";

const MAGIC_EDEN_ESCROW_PROGRAM_ID = new PublicKey(
  "MEisE1HzehtrDpAAT8PnLHjpSSkRYakotTuJRPjTpo8"
);

// Not sure yet what this is, looks like some sort of authority
const MAGIC_EDEN_SOMETHING = new PublicKey(
  "GUfCR9mK6azb9vcpsxgXyj7XRPAKJd4KMHTTVvtncGgp"
);

const MAGIC_EDEN_PLATFORM_FEE_ACCOUNT = new PublicKey(
  "2NZukH2TXpcuZP4htiuT8CFxcaQSWzkkR6kepSWnZ24Q"
);

interface EscrowState {
  sighash: number[];
  seller: PublicKey;
  tokenAccount: PublicKey;
  price: u64;
}

// 80 bytes total
export const EscrowStateLayout = struct<EscrowState>([
  seq(u8(), 8, "sighash"), // Possibly
  publicKey("seller"),
  publicKey("tokenAccount"),
  uint64("price"),
]);

// List transaction
// https://explorer.solana.com/tx/UcEGgWqHprxkfTApNECUCemh6KtHDqJ1eGnyie85YNDLCgxxfS61du9SKiTTBgvXGYDMcjGLPp9ch3m783QRz9A
// data looks like sighash + price + nonce

// DeList transaction
// https://explorer.solana.com/tx/4Tdm5KTu4TfEV8UFiy8Q2tT4EG7P4pZbxeFXnEEqHsVY83uSUhx54tjYWR8FVp5Q35ym4wtFivmah2zsEdmLk6wv

const BUY_SIGHASH = Buffer.from([
  0x43, 0x8e, 0x36, 0xd8, 0x1f, 0x1d, 0x1b, 0x5c,
]);

async function createBuyInstruction(
  escrow: PublicKey,
  escrowState: EscrowState,
  nftMint: PublicKey,
  metadata: Metadata,
  buyer: PublicKey
): Promise<TransactionInstruction> {
  const keys = [
    { pubkey: buyer, isWritable: true, isSigner: true },
    { pubkey: escrowState.tokenAccount, isWritable: true, isSigner: false },
    { pubkey: escrowState.seller, isWritable: true, isSigner: false },
    { pubkey: escrow, isWritable: true, isSigner: false },
    {
      pubkey: MAGIC_EDEN_SOMETHING,
      isWritable: false,
      isSigner: false,
    },
    { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
    { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
    {
      pubkey: MAGIC_EDEN_PLATFORM_FEE_ACCOUNT,
      isWritable: true,
      isSigner: false,
    },
    { pubkey: metadata.pubkey, isWritable: false, isSigner: false },
  ];

  // Then creators for royalties
  for (const creator of metadata.data.data.creators) {
    keys.push({
      pubkey: new PublicKey(creator.address),
      isWritable: true,
      isSigner: false,
    });
  }

  console.log(keys.map(({ pubkey }) => pubkey.toBase58()));

  return {
    programId: MAGIC_EDEN_ESCROW_PROGRAM_ID,
    keys,
    // 48 bytes of data
    // 8 byte sighash, 8 byte price, 32 bytes mint
    // TODO: /!\ From a user interface price needs to be exposed at the top and not reread afterwards otherwise user can be frontrun with a price change
    data: Buffer.concat([
      BUY_SIGHASH,
      escrowState.price.toBuffer(),
      nftMint.toBuffer(),
    ]),
  };
}

export class MagicEdenEscrow {
  static async fetch(connection: Connection, pubkey: PublicKey) {
    const accountInfo = await connection.getAccountInfo(pubkey);
    return EscrowStateLayout.decode(accountInfo.data);
  }

  // Buy https://solscan.io/tx/2TGe7grZEyc1qB1TGCD3oJ9WESwjbRefv5uu7JQjtA1wrCc3zvkaSmgkRLRYMstXAAzkrkyJM4Z7WTndnM9X8ifo
  static async createBuyTransaction(
    connection: Connection,
    escrow: PublicKey,
    escrowState: EscrowState,
    buyer: PublicKey
  ): Promise<Transaction> {
    const accountInfo = await connection.getAccountInfo(
      escrowState.tokenAccount
    );
    // TODO: use abstraction for decoding token accounts
    const nftMint = new PublicKey(
      TokenAccountLayout.decode(accountInfo.data).mint
    );
    const metadata = await Metadata.findByMint(connection, nftMint);

    return new Transaction({ feePayer: buyer }).add(
      await createBuyInstruction(escrow, escrowState, nftMint, metadata, buyer)
    );
  }
}
