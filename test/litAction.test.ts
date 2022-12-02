import { LitActionsSDK } from "./../src/@types/yacht-lit-sdk";
import { LitAuthSig, YachtLitSdk } from "../src";
import { JsonRpcProvider } from "@ethersproject/providers";
import { ethers, UnsignedTransaction } from "ethers";
import { LitERC20SwapCondition } from "../src/@types/yacht-lit-sdk";
import { expect } from "chai";

describe("Lit Action Code Tests", () => {
  let response: any;
  const counterPartyAAddress = "0x630A5FA5eA0B94daAe707fE105404749D52909B9";
  const counterPartyBAddress = "0x96242814208590C563AAFB6270d6875A12C5BC45";
  const tokenAAddress = "0xBA62BCfcAaFc6622853cca2BE6Ac7d845BC0f2Dc"; // FAU TOKEN
  const tokenBAddress = "0xeDb95D8037f769B72AAab41deeC92903A98C9E16"; // TEST TOKEN
  const sdk = new YachtLitSdk(
    new ethers.providers.JsonRpcProvider(
      "https://polygon-mumbai.g.alchemy.com/v2/fbWG-Mg4NtNwWVOP-MyV73Yu5EGxLT8Z",
    ),
    "serrano",
    new ethers.Wallet(
      "0ef7ff778c8c7d9320d9d9475b8e4f1699ec7185b7f6f56d1c0a11a766e4b01b",
      new ethers.providers.JsonRpcProvider(
        "https://polygon-mumbai.g.alchemy.com/v2/fbWG-Mg4NtNwWVOP-MyV73Yu5EGxLT8Z",
      ),
    ),
  );
  const chainAParams = {
    counterPartyAddress: counterPartyAAddress,
    tokenAddress: tokenAAddress,
    chain: "goerli",
    amount: "16",
    decimals: 18,
  };
  const chainBParams = {
    counterPartyAddress: counterPartyBAddress,
    tokenAddress: tokenBAddress,
    chain: "mumbai",
    amount: "8",
    decimals: 18,
  };
  const LitActionCode = sdk.createERC20SwapLitAction(
    chainAParams,
    chainBParams,
  );

  beforeEach(async () => {
    const authSig = await sdk.generateAuthSig();

    // NOTE: This PKP (id: 41025662842943809580188618211850367401827873753328646565512708896476699192070)
    // @ ETH Address: 0xc0F7c332e5c6C7C642050a0DB64898f0a3B4dD69
    // must have 16 FAU tokens on Goerli and 8 TEST tokens on Mumbai in order for this test suite to pass

    response = await sdk.runLitAction({
      authSig,
      pkpPubKey:
        "0x04f944cbf8a0ce169284c6954af9f5d06790c3111228432fa248f3048e2105436b1cd09a69066d57db700e8c8938ab68538223512d917dbbbe57884c2da8f308a5",
      code: LitActionCode,
    });
  });

  it("Should sign chain A transaction when both conditions are met", async () => {
    const chainASignature = response.signatures.chainASignature.signature;
    expect(chainASignature).to.not.be.null;
  });

  it("Should sign chain B transaction when both conditions are met", async () => {
    const chainBSignature = response.signatures.chainBSignature.signature;
    expect(chainBSignature).to.not.be.null;
  });

  it("Chain A transaction should be sent to Token A Address", async () => {
    const chainATx = response.response.chainATransaction;
    expect(chainATx.to).to.equal(tokenAAddress);
  });

  it("Chain B transaction should be sent to Token B Address", async () => {
    const chainBTx = response.response.chainBTransaction;
    expect(chainBTx.to).to.equal(tokenBAddress);
  });

  it("Should not generate a Lit Action for swap across same chain", async () => {
    const sameChainAParams = {
      counterPartyAddress: counterPartyAAddress,
      tokenAddress: tokenAAddress,
      chain: "goerli",
      amount: "16",
      decimals: 18,
    };
    const sameChainBParams = {
      counterPartyAddress: counterPartyBAddress,
      tokenAddress: tokenBAddress,
      chain: "goerli",
      amount: "8",
      decimals: 18,
    };

    expect(function () {
      sdk.createERC20SwapLitAction(sameChainAParams, sameChainBParams);
    }).to.throw("Swap must be cross chain, same chains not supported");
  });
});
