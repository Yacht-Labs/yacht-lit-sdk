import { YachtLitSdk } from "../src";
import { ethers } from "ethers";
import { expect } from "chai";

describe("Lit Action Code Tests", () => {
  let response: any;
  const counterPartyAAddress = "0x630A5FA5eA0B94daAe707fE105404749D52909B9";
  const counterPartyBAddress = "0x96242814208590C563AAFB6270d6875A12C5BC45";
  const tokenAAddress = "0xBA62BCfcAaFc6622853cca2BE6Ac7d845BC0f2Dc"; // FAU TOKEN
  const tokenBAddress = "0xeDb95D8037f769B72AAab41deeC92903A98C9E16"; // TEST TOKEN
  const sdk = new YachtLitSdk(
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
  let LitActionCode: string;
  describe("Users meet swap conditions", () => {
    beforeEach(async () => {
      LitActionCode = sdk.createERC20SwapLitAction(chainAParams, chainBParams);
      const authSig = await sdk.generateAuthSig();

      // NOTE: This PKP (id: 41025662842943809580188618211850367401827873753328646565512708896476699192070)
      // @ EVM Address: 0xc0F7c332e5c6C7C642050a0DB64898f0a3B4dD69
      // must have 16 FAU tokens on Goerli and 8 TEST tokens on Mumbai in order for this test suite to pass

      response = await sdk.runLitAction({
        authSig,
        pkpPublicKey:
          "0x04f944cbf8a0ce169284c6954af9f5d06790c3111228432fa248f3048e2105436b1cd09a69066d57db700e8c8938ab68538223512d917dbbbe57884c2da8f308a5",
        code: LitActionCode,
      });
    });

    it("Should generate code ready to be written to IPFS", async () => {
      expect(typeof LitActionCode).to.equal("string");
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

    it("Chain A transaction should send tokens to counterparty B", async () => {
      const chainATx = response.response.chainATransaction;
      const transferInterface = new ethers.utils.Interface([
        "function transfer(address, uint256) returns (bool)",
      ]);
      const parsedData = transferInterface.parseTransaction({
        data: chainATx.data,
      });
      expect(parsedData.args[0]).to.equal(counterPartyBAddress);
    });

    it("Chain B transaction should send tokens to counterparty A", async () => {
      const chainBTx = response.response.chainBTransaction;
      const transferInterface = new ethers.utils.Interface([
        "function transfer(address, uint256) returns (bool)",
      ]);
      const parsedData = transferInterface.parseTransaction({
        data: chainBTx.data,
      });
      expect(parsedData.args[0]).to.equal(counterPartyAAddress);
    });
  });

  describe("Edge case", () => {
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

  describe("Chain B Clawback", () => {
    // NOTE: This PKP (id: 61307482928186888952457892953112411748413241897025503269529894097075252586127)
    // @ Mumbai Address: 0x64026E8D5A181ADf32ce06C7805D0dD9f257E675
    // must have 8 TEST tokens on Mumbai in order for this test suite to pass
    beforeEach(async () => {
      const authSig = await sdk.generateAuthSig();
      const originTime = new Date().setDate(new Date().getDate() - 4);
      LitActionCode = sdk.createERC20SwapLitAction(
        chainAParams,
        chainBParams,
        originTime,
      );

      response = await sdk.runLitAction({
        authSig,
        pkpPublicKey:
          "0x0487375eeb2fb53b3a13c53be11550f880e41a7a23b20b77bd5cc96a37014ffe7755b0a84419c62e3f773843ff96cb79d28065c6dee988a051f901ab141b392b33",
        code: LitActionCode,
      });
    });

    it("Should generate a clawback transaction if swap conditions aren't met and clawback duration has elapsed", async () => {
      const chainBSignature = response.signatures.chainBSignature.signature;
      expect(chainBSignature).to.not.be.null;
      const chainASignature = response.signatures.chainASignature;
      expect(chainASignature).to.be.undefined;
    });

    it("Clawback transaction should send funds back to correct counterparty", async () => {
      const chainBTx = response.response.chainBTransaction;
      const transferInterface = new ethers.utils.Interface([
        "function transfer(address, uint256) returns (bool)",
      ]);
      const parsedData = transferInterface.parseTransaction({
        data: chainBTx.data,
      });
      expect(parsedData.args[0]).to.equal(counterPartyBAddress);
    });
  });

  describe("Chain A Clawback", () => {
    // NOTE: This PKP (id: 18029396176372009967585463888023703874182675754300604059110822805457743134635)
    // @ Goerli Address: 0xf13ed0909A9d09442134f7149899AAe6e460DA77
    // must have 16 FAU tokens on Goerli in order for this test suite to pass
    beforeEach(async () => {
      const authSig = await sdk.generateAuthSig();
      const originTime = new Date().setDate(new Date().getDate() - 4);
      LitActionCode = sdk.createERC20SwapLitAction(
        chainAParams,
        chainBParams,
        originTime,
      );

      response = await sdk.runLitAction({
        authSig,
        pkpPublicKey:
          "0x04f2d75d0bdeeb4174fb7589e1c8e4c6b5a6bb13980daff4e500058197ab42427e38aaf74d85ffbb9a5cf3b40473d53a143e86452305c5afee845c3e43e398956a",
        code: LitActionCode,
      });
    });

    it("Should generate a clawback transaction if swap conditions aren't met and clawback duration has elapsed", async () => {
      const chainASignature = response.signatures.chainASignature.signature;
      expect(chainASignature).to.not.be.null;
      const chainBSignature = response.signatures.chainBSignature;
      expect(chainBSignature).to.be.undefined;
    });

    it("Clawback transaction should send funds back to correct counterparty", async () => {
      const chainATx = response.response.chainATransaction;
      const transferInterface = new ethers.utils.Interface([
        "function transfer(address, uint256) returns (bool)",
      ]);
      const parsedData = transferInterface.parseTransaction({
        data: chainATx.data,
      });
      expect(parsedData.args[0]).to.equal(counterPartyAAddress);
    });
  });
});
