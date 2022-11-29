import { LitERC20SwapConditionArray } from "./../src/@types/yacht-lit-sdk";
import { YachtLitSdk } from "../src";
import { JsonRpcProvider } from "@ethersproject/providers";
import { ethers } from "ethers";
import { LitERC20SwapConditionParams } from "../src/@types/yacht-lit-sdk";
describe("Yacht-Lit SDK Unit Tests", () => {
  describe("ERC20Transfer", () => {
    it("Should generate swap conditions properly", () => {
      // const erc20ContractB = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
      const conditionParamsA: LitERC20SwapConditionParams = {
        contractAddress: "0x6b175474e89094c44da98b954eedeac495271d0f",
        chain: "mumbai",
        amount: "10",
        decimals: 6,
      };
      const conditionParamsB: LitERC20SwapConditionParams = {
        contractAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
        chain: "polygon",
        amount: "10",
        decimals: 10,
      };
      const expectedResult: LitERC20SwapConditionArray = [
        {
          conditionType: "evmBasic",
          contractAddress: conditionParamsA.contractAddress,
          standardContractType: "ERC20",
          chain: conditionParamsA.chain,
          method: "balanceOf",
          parameters: ["address"],
          returnValueTest: {
            comparator: ">=",
            value: ethers.BigNumber.from(conditionParamsA.amount)
              .mul(
                ethers.BigNumber.from(10).pow(
                  ethers.BigNumber.from(conditionParamsA.decimals),
                ),
              )
              .toString(),
          },
        },
        {
          conditionType: "evmBasic",
          contractAddress: conditionParamsB.contractAddress,
          standardContractType: "ERC20",
          chain: conditionParamsB.chain,
          method: "balanceOf",
          parameters: ["address"],
          returnValueTest: {
            comparator: ">=",
            value: ethers.BigNumber.from(conditionParamsB.amount)
              .mul(
                ethers.BigNumber.from(10).pow(
                  ethers.BigNumber.from(conditionParamsB.decimals),
                ),
              )
              .toString(),
          },
        },
      ];
      const sdk = new YachtLitSdk(
        new JsonRpcProvider("url"),
        ethers.Wallet.createRandom(),
      );
      expect(
        sdk.generateERC20SwapConditions(conditionParamsA, conditionParamsB),
      ).toEqual(expectedResult);
    });

    it("Should sign two transactions when both conditions are met", async () => {
      const conditionParamsA: LitERC20SwapConditionParams = {
        contractAddress: "0xBA62BCfcAaFc6622853cca2BE6Ac7d845BC0f2Dc",
        chain: "goerli",
        amount: "10",
        decimals: 18,
      };
      const conditionParamsB: LitERC20SwapConditionParams = {
        contractAddress: "0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747",
        chain: "mumbai",
        amount: "10",
        decimals: 6,
      };
      const sdk = new YachtLitSdk(
        new JsonRpcProvider("url"),
        ethers.Wallet.createRandom(),
      );
      // pk: f3df8b10ac9be101d40ff4656b6d446f5dc400ed3b2545f3871fea8cff94d791
      // adr: 0xe811b31f7f6054DBda8C15b1426d84bE6f2DD403
      // pkp pubKey: 0x04bae7b4f9dc95542bb8b70385a9808070aa1786c6cd3efb25094df52bf147de6810675c13f618212960ff0e8056407f16a6328e576cad88a416e5387c89d6f179
      // pkp eth address:  0x4d34b9829e0FA745d7AC4Da1F8C0577caefc6F70
      // tokenid: 21329423771703297872260561536219810650925924038293952807832327725446726064485
      const conditions = sdk.generateERC20SwapConditions(
        conditionParamsA,
        conditionParamsB,
      );
      const tx0 = sdk.generateUnsignedERC20Transaction({
        tokenAddress: "0xBA62BCfcAaFc6622853cca2BE6Ac7d845BC0f2Dc",
        counterPartyAddress: await ethers.Wallet.createRandom().getAddress(),
        tokenAmount: "10",
        decimals: 18,
        chainId: 420,
        nonce: 0,
      });
      const tx1 = sdk.generateUnsignedERC20Transaction({
        tokenAddress: "0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747",
        counterPartyAddress: await ethers.Wallet.createRandom().getAddress(),
        tokenAmount: "10",
        decimals: 6,
        chainId: 80001,
        nonce: 0,
      });
      const litActionCode = sdk.generateERC20SwapLitActionCode(
        tx0,
        tx1,
        conditions,
      );
    });
  });
});
