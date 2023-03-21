const {
  getMumbaiPkpPublicKey,
  getMumbaiPrivateKey,
  getMumbaiProviderUrl,
} = require("./environment");
const { Wallet, providers } = require("ethers");
const { YachtLitSdk } = require("../sdk");

const wallet = new Wallet(
  getMumbaiPrivateKey(),
  new providers.JsonRpcProvider(getMumbaiProviderUrl()),
);
const sdk = new YachtLitSdk({ signer: wallet, btcTestNet: true });

(async () => {
  const { publicKey } = await sdk.mintPkp();
  const btcAddress = await sdk.getPkpBtcAddress(publicKey);
  console.log(btcAddress + "." + publicKey);
})().catch((err) => {
  console.error(err);
});
