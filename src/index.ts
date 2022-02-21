import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { SolseaEscrow } from "./solsea";
import { MagicEdenEscrow } from "./magic-eden";

// A random wallet pk found that will be capable of buying that thing
const USER_PUBLIC_KEY = new PublicKey(
  "AXUChvpRwUUPMJhA4d23WcoyAL7W8zgAeo7KoH57c75F"
);

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
  console.log(buyTx.instructions[0].data);
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
