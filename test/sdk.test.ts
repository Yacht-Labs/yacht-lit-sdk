import {
  YachtLitSdk,
  LitERC20SwapCondition,
  LitERC20SwapConditionParams,
} from "../src";
import { JsonRpcProvider } from "@ethersproject/providers";
import { ethers } from "ethers";
describe("Yacht-Lit SDK Unit Tests", () => {
  describe("ERC20Transfer", () => {
    it("Generates swap conditions ", () => {
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
      const expectedResult: Array<LitERC20SwapCondition | { operator: "and" }> =
        [
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
          { operator: "and" },
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
  });
});
