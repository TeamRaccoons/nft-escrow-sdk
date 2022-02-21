import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { SolseaEscrow } from "./solsea";
import { MagicEdenEscrow } from "./magic-eden";

// A random wallet pk found that will be capable of buying that thing
const USER_PUBLIC_KEY = new PublicKey(
  "AXUChvpRwUUPMJhA4d23WcoyAL7W8zgAeo7KoH57c75F"
);

// https://explorer.solana.com/tx/43EHPCWRJB62m26KZ9YVUxea3PJGMc5dNtcFz3jLteD3vt3HXFcddn5AfeNkYmzqHFjLXMrQ1g9qHLr4buiYd6mn
async function magicEdenInv(connection: Connection) {
  const ai = await connection.getAccountInfo(
    new PublicKey("B6PfupfKToouqZZntGoCrso1CJynWzj1oQAX5ShpjuG1")
  );
  // Anchor discriminator?!?
  console.log(ai.data.slice(8 + 2 * 32));
  console.log(ai.data.readBigUint64LE(8 + 2 * 32));
  const seller = new PublicKey("9hmSsd3MUjCRKZD6g5rf8Hf1E3KTDakbkw31CAWhUQSu");
  console.log("seller", seller.toBuffer());
  console.log(ai.data.indexOf(seller.toBuffer()));
  console.log(new PublicKey(ai.data.slice(8 + 2 * 32, 8 + 3 * 32)).toBase58());
}

async function solseaTest(connection: Connection) {
  const escrowPk = new PublicKey("1aQYQjPHsBxZrdDWtFbGrdjjts1uwLTasfaTpuE3QXd");

  const escrowState = await SolseaEscrow.fetch(connection, escrowPk);

  const buyTx = await SolseaEscrow.createBuyTransaction(
    escrowPk,
    escrowState,
    USER_PUBLIC_KEY
  );
  const { value } = await connection.simulateTransaction(buyTx);
  console.log(value);
}

async function magicEdenTest(connection: Connection) {
  const escrowPk = new PublicKey(
    "B6PfupfKToouqZZntGoCrso1CJynWzj1oQAX5ShpjuG1"
  );

  const escrowState = await MagicEdenEscrow.fetch(connection, escrowPk);

  const buyTx = await MagicEdenEscrow.createBuyTransaction(
    connection,
    escrowPk,
    escrowState,
    USER_PUBLIC_KEY
  );
  const { value } = await connection.simulateTransaction(buyTx);
  console.log(value);
}

async function main() {
  const connection = new Connection(clusterApiUrl("mainnet-beta"));

  // Let's simulate buying
  await solseaTest(connection);
  await magicEdenTest(connection);
}
main();
