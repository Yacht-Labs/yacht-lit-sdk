import { TransactionRequest } from "@ethersproject/providers";
import { YachtLitSdk } from "./../src/sdk";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Deferrable } from "ethers/lib/utils";

describe("Yacht-Lit SDK Hardhat Tests", () => {
  describe("ERC20Transfer", () => {
    let YachtToken: any;
    let deployedYachtToken: any;
    let owner: SignerWithAddress;
    let addrs: SignerWithAddress[];

    beforeEach(async () => {
      [owner, ...addrs] = await ethers.getSigners();

      YachtToken = await ethers.getContractFactory("YachtToken");

      deployedYachtToken = await YachtToken.deploy();
      await deployedYachtToken.deployed();
    });
    it("Deploys the contract properly", async () => {
      const ownerBalance = await deployedYachtToken.balanceOf(owner.address);
      expect(await deployedYachtToken.totalSupply()).to.equal(ownerBalance);
    });

    it("Generates and sends an ERC20 token transfer", async () => {
      // const wallet = new ethers.Wallet(owner);
      const sdk = new YachtLitSdk(ethers.provider, owner);
      const amountToTransfer = "10";
      const unsignedTransaction = sdk.generateUnsignedERC20Transaction({
        tokenAddress: deployedYachtToken.address,
        tokenAmount: amountToTransfer,
        counterPartyAddress: addrs[0].address,
        decimals: 18,
        chainId: 31337,
        nonce: await owner.getTransactionCount(),
      }) as Deferrable<TransactionRequest>;
      await owner.sendTransaction(unsignedTransaction);
      const counterPartyBalance = await deployedYachtToken.balanceOf(
        addrs[0].address,
      );
      expect(counterPartyBalance).to.equal(
        ethers.utils.parseUnits(amountToTransfer, "ether"),
      );
    });
  });
});
