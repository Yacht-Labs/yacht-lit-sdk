import { ethers } from "ethers";
import { YachtLitSdk } from "./sdk";

const sdk = new YachtLitSdk(
  new ethers.providers.JsonRpcProvider(
    "https://polygon-mumbai.g.alchemy.com/v2/fbWG-Mg4NtNwWVOP-MyV73Yu5EGxLT8Z",
  ),
  // new ethers.Wallet(
  //   "b6d84955bc272c590344b528e4cebc73a72b0fc250b176680ff39807ee272f2b",
  //   new ethers.providers.JsonRpcProvider(
  //     "https://polygon-mumbai.g.alchemy.com/v2/fbWG-Mg4NtNwWVOP-MyV73Yu5EGxLT8Z",
  //   ),
  // ),
  "serrano",
);

// params:
// tx0
// tx1
// conditions: array

const main = async () => {
  const chainAParams = {
    counterPartyAddress: "0x630A5FA5eA0B94daAe707fE105404749D52909B9",
    tokenAddress: "0xBA62BCfcAaFc6622853cca2BE6Ac7d845BC0f2Dc",
    chain: "goerli",
    amount: "5",
    decimals: 18,
  };
  const chainBParams = {
    counterPartyAddress: "0x96242814208590C563AAFB6270d6875A12C5BC45",
    tokenAddress: "0xeDb95D8037f769B72AAab41deeC92903A98C9E16", // TEST TOKEN
    chain: "mumbai",
    amount: "8",
    decimals: 18,
  };
  const LitActionCode = sdk.createERC20SwapLitAction(
    chainAParams,
    chainBParams,
  );
  // console.log({ LitActionCode });
  //const pkpInfo = await sdk.mintGrantBurnWithJs(LitActionCode);
  //console.log({ pkpInfo });

  const authSig = await sdk.generateAuthSig();
  const response = await sdk.runLitAction({
    authSig,
    pkpPubKey:
      "0x04180e158a21c93d3462c06320094779172a7ffcd3141e105a83c15e289e46daf3aae40ee12b50039108d460254cdb57b149be2f5ddc772f244b94d1015a2aa347",
    code: LitActionCode,
    // ipfsCID: "QmSCxGRRznNDJRDri9qd3batstNiSj9xDHRTVhj8j2TKfo",
  });
  const mumbaiProvider = new ethers.providers.JsonRpcProvider(
    "https://polygon-mumbai.g.alchemy.com/v2/fbWG-Mg4NtNwWVOP-MyV73Yu5EGxLT8Z",
  );
  const goerliProvider = new ethers.providers.JsonRpcProvider(
    "https://eth-goerli.g.alchemy.com/v2/RZYixkcKT7io37tj7KCobPlyVB1IOciO",
  );
  const chainASignature = response.signatures.chainASignature.signature;
  const chainATx = response.response.chainATransaction;
  const goerliTx = await goerliProvider.sendTransaction(
    ethers.utils.serializeTransaction(chainATx, chainASignature),
  );
  console.log(await goerliTx.wait());

  const chainBSignature = response.signatures.chainBSignature.signature;
  const chainBTx = response.response.chainBTransaction;
  const tx = await mumbaiProvider.sendTransaction(
    ethers.utils.serializeTransaction(chainBTx, chainBSignature),
  );
  console.log(await tx.wait());
};
// 0xa6d77fC34c9003Af4d0F6226ca93D734f702D285 -HANKS
// 0x0B83A2A6178ba5474C514f325b15f9aC91B1F84C  -STRAUS
// 0x8280667b123aaeF271b05685E8105477c180920D - NEWEST
main();
