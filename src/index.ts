import {
  clusterApiUrl,
  Connection,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { createBuyTransaction, EscrowStateLayout } from "./solsea";

// A random wallet pk found that will be capable of buying that thing
const USER_PUBLIC_KEY = new PublicKey(
  "AXUChvpRwUUPMJhA4d23WcoyAL7W8zgAeo7KoH57c75F"
);

async function main() {
  const connection = new Connection(clusterApiUrl("mainnet-beta"));

  // Let's simulate buying this NFT ape thing
  const escrowPk = new PublicKey("1aQYQjPHsBxZrdDWtFbGrdjjts1uwLTasfaTpuE3QXd");

  const escrowAccountInfo = await connection.getAccountInfo(escrowPk);
  const escrowState = EscrowStateLayout.decode(escrowAccountInfo.data);

  const buyTx = await createBuyTransaction(
    escrowPk,
    escrowState,
    USER_PUBLIC_KEY
  );
  const { value } = await connection.simulateTransaction(buyTx);
  console.log(value);
}
main();
