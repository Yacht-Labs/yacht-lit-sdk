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

const generateERC20SwapLitActionCode = (
  tx0Param: any,
  tx1Param: any,
  conditionsParam: any,
) => {
  return `
  const go = async () => {

    const conditions = ${JSON.stringify(conditionsParam)};
    const tx0 = ${JSON.stringify(tx0Param)};
    const tx1 = ${JSON.stringify(tx1Param)};

    conditions.map((condition, i) => {
      if (i%2 === 0) {
        condition.parameters = [pkpPublicKey]
      }
      return condition;
    });

    tx0.from = pkpPublicKey;
    tx1.from = pkpPublicKey;

    const testResult = await Lit.Actions.checkConditions({
      conditions,
      authSig,
      chain
    })

    if (!testResult) {
      return;
    }

    const tx0Hash = ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.arrayify(ethers.utils.serializeTransaction(tx0)),
      ),
    );

    const tx1Hash = ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.arrayify(ethers.utils.serializeTransaction(tx1)),
      ),
    );

    const sigShare = await LitActions.signEcdsa({ toSign: tx0Hash, publicKey, sigName: "tx0Signature" });
    const sigShare2 = await LitActions.signEcdsa({ toSign: tx1Hash, publicKey, sigName: "tx1Signature" });

    LitActions.setResponse({response: JSON.stringify({tx0, tx1})});
  };
    
  go();
  `;
};

const main = async () => {
  const conditions = sdk.generateERC20SwapConditions({
    contractAddress: "0xeDb95D8037f769B72AAab41deeC92903A98C9E16",
    chain: "mumbai",
    amount: "0",
    decimals: 18,
  });

  const tx0 = sdk.generateUnsignedERC20Transaction({
    tokenAddress: "0xeDb95D8037f769B72AAab41deeC92903A98C9E16",
    counterPartyAddress: "0x630A5FA5eA0B94daAe707fE105404749D52909B9",
    tokenAmount: "100",
    decimals: 18,
    chainId: 80001,
  });

  const tx1 = sdk.generateUnsignedERC20Transaction({
    tokenAddress: "0xeDb95D8037f769B72AAab41deeC92903A98C9E16",
    counterPartyAddress: "0x630A5FA5eA0B94daAe707fE105404749D52909B9",
    tokenAmount: "100",
    decimals: 18,
    chainId: 80001,
  });

  const litActionCode = generateERC20SwapLitActionCode(tx0, tx1, conditions);
  console.log({ litActionCode });
  const pkpInfo = await sdk.mintGrantBurnWithJs(litActionCode);
  // console.log({ pkpInfo });

  const authSig = await sdk.generateAuthSig();
  // console.log({ authSig });
  const res = await sdk.runLitAction(
    pkpInfo.ipfsCID,
    authSig,
    pkpInfo.pkp.publicKey,
    conditions,
  );
  console.log({ res });
};

main();
