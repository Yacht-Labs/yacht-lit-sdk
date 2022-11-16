import { ethers } from "ethers";
import { YachtLitSdk } from "./sdk";

const sdk = new YachtLitSdk(
  "https://polygon-mumbai.g.alchemy.com/v2/Agko3FEsqf1Kez7aSFPZViQnUd8sI3rJ",
  "b6d84955bc272c590344b528e4cebc73a72b0fc250b176680ff39807ee272f2b",
);

// const litActionCode = `
// const go = async () => {
// // this requests a signature share from the Lit Node
// // the signature share will be automatically returned in the response from the node
// // and combined into a full signature by the LitJsSdk for you to use on the client
// // all the params (toSign, publicKey, sigName) are passed in from the LitJsSdk.executeJs() function
// const sigShare = await LitActions.signEcdsa({ toSign, publicKey, sigName });
// };

// go();
// `;

// sdk.upLoadToIpfs(litActionCode).then((x) => console.dir(x));
const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://polygon-mumbai.g.alchemy.com/v2/Agko3FEsqf1Kez7aSFPZViQnUd8sI3rJ",
  );

  const wallet = new ethers.Wallet(
    "b6d84955bc272c590344b528e4cebc73a72b0fc250b176680ff39807ee272f2b",
    provider,
  );
  const nonce = await wallet.getTransactionCount();

  const unsignedTx = await sdk.generateUnsignedSwapTransaction({
    erc20Address: "0xeDb95D8037f769B72AAab41deeC92903A98C9E16",
    counterPartyAddress: "0x96242814208590c563aafb6270d6875a12c5bc45",
    tokenAmount: "100",
    decimals: 18,
    chainId: 80001,
    nonce,
  });

  const signedTx = await wallet.signMessage(unsignedTx);
  console.log({ signedTx });
  // const tx = await provider.sendTransaction(signedTx);
  // console.log(await tx.wait());
};

main();
