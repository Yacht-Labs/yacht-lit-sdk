import { ethers } from "ethers";
import { YachtLitSdk } from "./sdk";

const sdk = new YachtLitSdk(
  new ethers.providers.JsonRpcProvider(
    "https://polygon-mumbai.g.alchemy.com/v2/fbWG-Mg4NtNwWVOP-MyV73Yu5EGxLT8Z",
  ),
  new ethers.Wallet(
    "b6d84955bc272c590344b528e4cebc73a72b0fc250b176680ff39807ee272f2b",
    new ethers.providers.JsonRpcProvider(
      "https://polygon-mumbai.g.alchemy.com/v2/fbWG-Mg4NtNwWVOP-MyV73Yu5EGxLT8Z",
    ),
  ),
  "serrano",
);

// params:
// tx0
// tx1
// conditions: array

const main = async () => {
  const nonce = await new ethers.providers.JsonRpcProvider(
    "https://polygon-mumbai.g.alchemy.com/v2/fbWG-Mg4NtNwWVOP-MyV73Yu5EGxLT8Z",
  ).getTransactionCount("0x630A5FA5eA0B94daAe707fE105404749D52909B9");
  console.log({ nonce });
  // const conditions = sdk.generateERC20SwapConditions({
  //   contractAddress: "0xeDb95D8037f769B72AAab41deeC92903A98C9E16",
  //   chain: "mumbai",
  //   amount: "0",
  //   decimals: 18,
  // });

  // const tx0 = sdk.generateUnsignedERC20Transaction({
  //   tokenAddress: "0xeDb95D8037f769B72AAab41deeC92903A98C9E16",
  //   counterPartyAddress: "0x630A5FA5eA0B94daAe707fE105404749D52909B9",
  //   tokenAmount: "100",
  //   decimals: 18,
  //   chainId: 80001,
  // });

  // const tx1 = sdk.generateUnsignedERC20Transaction({
  //   tokenAddress: "0xeDb95D8037f769B72AAab41deeC92903A98C9E16",
  //   counterPartyAddress: "0x630A5FA5eA0B94daAe707fE105404749D52909B9",
  //   tokenAmount: "100",
  //   decimals: 18,
  //   chainId: 80001,
  // });

  // const litActionCode = sdk.generateERC20SwapLitActionCode(
  //   tx0,
  //   tx1,
  //   conditions,
  // );
  // console.log({ litActionCode });
  // const pkpInfo = await sdk.mintGrantBurnWithJs(litActionCode);
  // // console.log({ pkpInfo });

  // const authSig = await sdk.generateAuthSig();
  // // console.log({ authSig });
  // const res = await sdk.runLitAction(
  //   pkpInfo.ipfsCID,
  //   authSig,
  //   pkpInfo.pkp.publicKey,
  //   conditions,
  // );
  // console.dir({ res });
  // console.log("sig0: ", res.signatures.tx0Signature);
  // console.log("sig1: ", res.signatures.tx1Signature);
  // console.log("tx0res: ", res.response.tx0);
  // console.log("tx1res: ", res.response.tx1);
};

main();
