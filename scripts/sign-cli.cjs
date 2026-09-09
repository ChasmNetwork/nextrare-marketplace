// echo <base64 tx> | node scripts/sign-cli.cjs <keypair.json>  → signed base64. Used by the demo-video recorder's fake wallet.
const { Keypair, VersionedTransaction } = require("@solana/web3.js");
const fs = require("fs");
const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.argv[2], "utf8"))));
const b64 = fs.readFileSync(0, "utf8").trim();
const tx = VersionedTransaction.deserialize(Buffer.from(b64, "base64"));
tx.sign([kp]);
process.stdout.write(Buffer.from(tx.serialize()).toString("base64"));
