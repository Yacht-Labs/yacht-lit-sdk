import { ethers } from "ethers";

export type LitSignature = {
  r: string;
  s: string;
  recid: string;
  signature: string;
  publicKey: string;
  dataSigned: string;
};

export type LitERC20SwapParams = {
  tokenAddress: string;
  counterPartyAddress: string;
  tokenAmount: string;
  decimals: number;
  chainId: number;
  nonce?: number;
  highGas?: boolean;
};

export type LitERC20SwapCondition = {
  conditionType: "evmBasic";
  contractAddress: string;
  standardContractType: "ERC20";
  chain: string; //TODO: can make ENUM
  method: "balanceOf";
  parameters: [string];
  returnValueTest: {
    comparator: ">=";
    value: string;
  };
};

export type LitERC20SwapConditionArray = Array<
  LitERC20SwapCondition | { operator: "and" }
>;

export type LitERC20SwapConditionParams = {
  contractAddress: string;
  chain: string;
  amount: string;
  decimals: number;
};
