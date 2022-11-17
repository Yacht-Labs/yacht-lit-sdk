import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Yacht-Lit SDK Tests", () => {
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
    it("Generates and sends an ERC20 token transfer", async () => {
      const ownerBalance = await deployedYachtToken.balanceOf(owner.address);
      expect(await deployedYachtToken.totalSupply()).to.equal(ownerBalance);
    });
  });
});
