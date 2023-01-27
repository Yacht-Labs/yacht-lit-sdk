import { LitERC20SwapParams, YachtLitSdk } from "../src";
import { ethers, Wallet } from "ethers";
import { expect } from "chai";
import {
  getGoerliPrivateKey,
  getGoerliProviderUrl,
  getMumbaiPrivateKey,
  getMumbaiProviderUrl,
} from "../src/utils/environment";
import TestTokenContract from "../src/abis/TestToken.json";
import { TestToken } from "../typechain-types/contracts/TestToken";
import { GasConfig } from "../src";

describe("Lit Action Code Tests", () => {
  let response: any;
  const goerliProvider = new ethers.providers.JsonRpcProvider(
    getGoerliProviderUrl(),
  );
  const mumbaiProvider = new ethers.providers.JsonRpcProvider(
    getMumbaiProviderUrl(),
  );
  const counterPartyAWallet = new Wallet(getGoerliPrivateKey(), goerliProvider);
  const counterPartyBWallet = new Wallet(getMumbaiPrivateKey(), mumbaiProvider);
  const counterPartyAAddress = counterPartyAWallet.address;
  const counterPartyBAddress = counterPartyBWallet.address;
  const tokenAAddress = "0xBA62BCfcAaFc6622853cca2BE6Ac7d845BC0f2Dc"; // GOERLI FAU TOKEN
  const tokenBAddress = "0xeDb95D8037f769B72AAab41deeC92903A98C9E16"; // MUMBAI TEST TOKEN
  const sdk = new YachtLitSdk(counterPartyBWallet);

  const tokenAContract = new ethers.Contract(
    tokenAAddress,
    TestTokenContract.abi,
    counterPartyAWallet,
  ) as TestToken;
  const tokenBContract = new ethers.Contract(
    tokenBAddress,
    TestTokenContract.abi,
    counterPartyBWallet,
  ) as TestToken;

  const chainAParams: LitERC20SwapParams = {
    counterPartyAddress: counterPartyAAddress,
    tokenAddress: tokenAAddress,
    chain: "goerli",
    amount: "10",
    decimals: 18,
  };
  const chainBParams: LitERC20SwapParams = {
    counterPartyAddress: counterPartyBAddress,
    tokenAddress: tokenBAddress,
    chain: "mumbai",
    amount: "10",
    decimals: 18,
  };

  const dummyGasConfig: GasConfig = {
    maxFeePerGas: "0",
    maxPriorityFeePerGas: "0",
    gasLimit: "0",
  };

  let LitActionCode: string;
  let ipfsCID: string;
  describe("Users meet swap conditions", () => {
    beforeAll(async () => {
      LitActionCode = sdk.createERC20SwapLitAction(chainAParams, chainBParams);
      ipfsCID = await sdk.getIPFSHash(LitActionCode);
      const pkpTokenData = await sdk.mintGrantBurnWithLitAction(ipfsCID);
      await (
        await tokenAContract.mint(
          pkpTokenData.address,
          ethers.utils.parseUnits("10", 18),
        )
      ).wait(2);
      await (
        await tokenBContract.mint(
          pkpTokenData.address,
          ethers.utils.parseUnits("10", 18),
        )
      ).wait(2);

      const authSig = await sdk.generateAuthSig();
      response = await sdk.runLitAction({
        authSig,
        pkpPublicKey: pkpTokenData.publicKey,
        code: LitActionCode,
        chainAGasConfig: dummyGasConfig,
        chainBGasConfig: dummyGasConfig,
      });
    }, 100000);

    it("Should generate code ready to be written to IPFS", async () => {
      expect(typeof LitActionCode).to.equal("string");
    });

    it("Should sign chain A transaction when both conditions are met", async () => {
      const chainASignature = response.signatures.chainASignature.signature;
      expect(chainASignature).to.not.be.null;
    });

    it("Should sign chain B transaction when both conditions are met", async () => {
      const chainBSignature = response?.signatures?.chainBSignature?.signature;
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
    let response: any;
    beforeAll(async () => {
      const originTime = new Date().setDate(new Date().getDate() - 4);
      LitActionCode = sdk.createERC20SwapLitAction(
        chainAParams,
        chainBParams,
        originTime,
      );
      const ipfsCID = await sdk.getIPFSHash(LitActionCode);
      const pkpTokenData = await sdk.mintGrantBurnWithLitAction(ipfsCID);
      await (
        await tokenBContract.mint(
          pkpTokenData.address,
          ethers.utils.parseUnits("10", 18),
        )
      ).wait(2);

      const authSig = await sdk.generateAuthSig();
      response = await sdk.runLitAction({
        authSig,
        pkpPublicKey: pkpTokenData.publicKey,
        code: LitActionCode,
        chainAGasConfig: dummyGasConfig,
        chainBGasConfig: dummyGasConfig,
      });
    }, 100000);

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
    beforeAll(async () => {
      const originTime = new Date().setDate(new Date().getDate() - 4);
      LitActionCode = sdk.createERC20SwapLitAction(
        chainAParams,
        chainBParams,
        originTime,
      );
      const ipfsCID = await sdk.getIPFSHash(LitActionCode);
      const pkpTokenData = await sdk.mintGrantBurnWithLitAction(ipfsCID);
      await (
        await tokenAContract.mint(
          pkpTokenData.address,
          ethers.utils.parseUnits("10", 18),
        )
      ).wait(2);

      const authSig = await sdk.generateAuthSig();
      response = await sdk.runLitAction({
        authSig,
        pkpPublicKey: pkpTokenData.publicKey,
        code: LitActionCode,
        chainAGasConfig: dummyGasConfig,
        chainBGasConfig: dummyGasConfig,
      });
    }, 100000);

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
