import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { createBuyTransaction, EscrowStateLayout } from "./solsea";

// A random wallet pk found that will be capable of buying that thing
const USER_PUBLIC_KEY = new PublicKey(
  "AXUChvpRwUUPMJhA4d23WcoyAL7W8zgAeo7KoH57c75F"
);

async function main() {
  const connection = new Connection(clusterApiUrl("mainnet-beta"));

  // Let's simulate buying this NFT ape thing https://explorer.solana.com/address/9vsQPXKuLbXeEywU4FKL7xZL1fFnuvohqX7WkbUhTMHg
  const escrowPk = new PublicKey(
    "Goz6DvgZ3Bi29UYJKys4RLJVRHoLqG6pgrTyitfKAmeS"
  );

  const escrowAccountInfo = await connection.getAccountInfo(escrowPk);
  const escrowState = EscrowStateLayout.decode(escrowAccountInfo.data);

  console.log(escrowState);

  const buyTx = await createBuyTransaction(
    escrowPk,
    escrowState,
    USER_PUBLIC_KEY
  );

  const { value } = await connection.simulateTransaction(buyTx);
  console.log(value);
}
main();
