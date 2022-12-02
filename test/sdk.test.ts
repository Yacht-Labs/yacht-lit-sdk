import { LitActionsSDK } from "./../src/@types/yacht-lit-sdk";
import { LitAuthSig, YachtLitSdk } from "../src";
import { JsonRpcProvider } from "@ethersproject/providers";
import { ethers, UnsignedTransaction } from "ethers";
import { LitERC20SwapCondition } from "../src/@types/yacht-lit-sdk";
import { testGenerateLitActionCode } from "./testGenerateLitActionCode";
describe("Yacht-Lit SDK Unit Tests", () => {
  describe("ERC20Transfer", () => {
    describe("Lit Action Code Tests", async () => {
      it("Should sign two transactions when both conditions are met", async () => {
        // const CHAIN_A = "ethereum";
        // const CHAIN_A_ID = 1;
        // const CHAIN_B_ID = 137;
        // const CHAIN_B = "polygon";
        // const CHAIN_A_COUNTERPARTY =
        //   "0x90B8F7A3004080a8dadC9Ab935250714a3A27aaE";
        // const CHAIN_B_COUNTERPARTY =
        //   "0x0003657aBb17eDe8C28BB40C81D20a6df35C9Cb3";
        // const CHAIN_A_CONTRACT_ADDRESS = "ChainAContractAddress";
        // const CHAIN_B_CONTRACT_ADDRESS = "ChainBContractAddress";
        // const PKP_PUBLIC_ADDRESS = "0x630A5FA5eA0B94daAe707fE105404749D52909B9";
        // const VALUE_TO_SWAP = "100";
        // const DECIMALS = 18;
        // const chainACondition: LitERC20SwapCondition = {
        //   conditionType: "evmBasic",
        //   contractAddress: CHAIN_A_CONTRACT_ADDRESS,
        //   standardContractType: "ERC20",
        //   chain: CHAIN_A, //TODO: can make ENUM
        //   method: "balanceOf",
        //   parameters: ["pkpPublicAddress"],
        //   returnValueTest: {
        //     comparator: ">=",
        //     value: VALUE_TO_SWAP,
        //   },
        // };
        // const chainBCondition: LitERC20SwapCondition = {
        //   conditionType: "evmBasic",
        //   contractAddress: CHAIN_B_CONTRACT_ADDRESS,
        //   standardContractType: "ERC20",
        //   chain: CHAIN_B, //TODO: can make ENUM
        //   method: "balanceOf",
        //   parameters: ["pkpPublicAddress"],
        //   returnValueTest: {
        //     comparator: ">=",
        //     value: VALUE_TO_SWAP,
        //   },
        // };
        // const chainATransaction = {
        //   to: CHAIN_B_COUNTERPARTY,
        //   nonce: 0,
        //   chainId: CHAIN_A_ID,
        //   maxFeePerGas: ethers.utils.parseUnits("102", "gwei").toString(),
        //   maxPriorityFeePerGas: ethers.utils
        //     .parseUnits("100", "gwei")
        //     .toString(),
        //   gasLimit: "1000000",
        //   from: "{{pkpPublicKey}}",
        //   data: "100",
        //   type: 2,
        // };
        // const chainBTransaction = {
        //   to: CHAIN_B_COUNTERPARTY,
        //   nonce: 0,
        //   chainId: CHAIN_B_ID,
        //   maxFeePerGas: ethers.utils.parseUnits("102", "gwei").toString(),
        //   maxPriorityFeePerGas: ethers.utils
        //     .parseUnits("100", "gwei")
        //     .toString(),
        //   gasLimit: "1000000",
        //   from: "{{pkpPublicKey}}",
        //   data: "100",
        //   type: 2,
        // };
        // const authSig: LitAuthSig = {
        //   sig: "signature",
        //   derivedVia: "derived",
        //   signedMessage: "signedMessage",
        //   address: "myAddress",
        // };
        // const jsParams = {
        //   pkpUncompressedPublicKey:
        //     "0x04cd9f4bec7e658a023f2b89d4062ed36529fae19ff9f07940c02532eeb4b972726a5a08f20dac526c3ee92778c035813bd2aaec34861e2b94a8588ea2856c775d",
        //   pkpCompressedPublicKey: "0x763686076117Fc30B9a81e329D6f85ba4A94AC54",
        // };
        // const litActionsSdkMock: LitActionsSDK = {
        //   checkConditions: jest.fn(),
        //   signEcdsa: jest.fn(),
        //   getLatestNonce: jest.fn(),
        //   setResponse: jest.fn(),
        // };
        // const originTime = Date.now();
        // await testGenerateLitActionCode(
        //   chainACondition,
        //   chainBCondition,
        //   chainATransaction,
        //   chainBTransaction,
        //   litActionsSdkMock,
        //   authSig,
        //   jsParams,
        //   originTime,
        // );
        // expect()
      });
    });
  });
});
