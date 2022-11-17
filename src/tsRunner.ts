import { ethers } from "ethers";
import { YachtLitSdk } from "./sdk";

const sdk = new YachtLitSdk(
  "https://polygon-mumbai.g.alchemy.com/v2/Agko3FEsqf1Kez7aSFPZViQnUd8sI3rJ",
  "b6d84955bc272c590344b528e4cebc73a72b0fc250b176680ff39807ee272f2b",
);

const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://polygon-mumbai.g.alchemy.com/v2/Agko3FEsqf1Kez7aSFPZViQnUd8sI3rJ",
  );

  const wallet = new ethers.Wallet(
    "b6d84955bc272c590344b528e4cebc73a72b0fc250b176680ff39807ee272f2b",
    provider,
  );
  const nonce = await wallet.getTransactionCount();

  const tx = sdk.generateUnsignedERC20Transaction({
    tokenAddress: "0xeDb95D8037f769B72AAab41deeC92903A98C9E16",
    counterPartyAddress: "0x96242814208590c563aafb6270d6875a12c5bc45",
    tokenAmount: "100",
    decimals: 18,
    chainId: 80001,
    nonce,
  });

  const signedTransaction = sdk.signTransaction(
    tx,
    "b6d84955bc272c590344b528e4cebc73a72b0fc250b176680ff39807ee272f2b",
  );

  provider.sendTransaction(signedTransaction);
};

main();
