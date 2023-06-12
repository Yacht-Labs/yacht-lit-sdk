import { MinEthersFactory } from "./../../typechain-types/common";
import { ethers, UnsignedTransaction } from "ethers";
import { LitAuthSig } from "./../utils/lit";
import { BigNumber } from "ethers";

export type LitSignature = {
  r: string;
  s: string;
  recid: string;
  signature: string;
  publicKey: string;
  dataSigned: string;
};

export type GasConfig = {
  maxFeePerGas: BigNumber | string;
  maxPriorityFeePerGas: BigNumber | string;
  gasLimit: BigNumber | string;
};

export type LitERC20SwapCondition = {
  conditionType: "evmBasic";
  contractAddress: string;
  standardContractType: "ERC20";
  chain: string;
  method: "balanceOf";
  parameters: [string];
  returnValueTest: {
    comparator: ">=";
    value: string;
  };
};

export type LitEVMNativeSwapCondition = {
  conditionType: "evmBasic";
  contractAddress: "";
  standardContractType: "";
  chain: string;
  method: "eth_getBalance";
  parameters: [string];
  returnValueTest: {
    comparator: ">=";
    value: string;
  };
};

export type LitSwapTransaction = {
  counterPartyAddress: string;
  tokenAddress: string;
  chain: string;
  amount: string;
  decimals: number;
  from?: string | undefined;
  nonce?: number | undefined;
};

export type LitActionCodeResponseA = {
  response: {
    chainATransaction?: {
      counterPartyAddress: string;
      tokenAddress: string;
      chain: string;
      amount: string;
      decimals: number;
      from?: string | undefined;
      nonce?: number | undefined;
    };
    chainBTransaction?: {
      counterPartyAddress: string;
      tokenAddress: string;
      chain: string;
      amount: string;
      decimals: number;
      from?: string | undefined;
      nonce?: number | undefined;
    };
  };
  signatures: {
    chainASignature?: any;
    chainBSignature?: any;
  };
};

export type LitActionCodeResponse = {
  response: {
    chainATransaction?: LitSwapTransaction;
    chainBTransaction?: LitSwapTransaction;
  };
  signatures: {
    chainASignature?: any;
    chainBSignature?: any;
  };
};

export type UtxoResponse = {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
  value: number;
}[];

export type LitERC20SwapParams = {
  counterPartyAddress: string;
  tokenAddress: string;
  chain: string;
  amount: string;
  decimals: number;
};

export type LitEthSwapParams = {
  counterPartyAddress: string;
  chain: string;
  amount: string;
  btcAddress: string;
};

export type LitBtcSwapParams = {
  counterPartyAddress: string;
  network: "testnet" | "mainnet";
  amount: string;
  ethAddress: string;
};

export interface LitYachtSdkParams {
  signer?: ethers.Wallet;
  pkpContractAddress?: string;
  btcTestNet?: boolean;
  btcApiEndpoint?: string;
}
export const LitChainIds: { [key: string]: number } = {
  ethereum: 1,
  polygon: 137,
  fantom: 250,
  xdai: 100,
  bsc: 56,
  arbitrum: 42161,
  avalanche: 43114,
  fuji: 43113,
  harmony: 1666600000,
  kovan: 42,
  mumbai: 80001,
  goerli: 5,
  ropsten: 3,
  rinkeby: 4,
  cronos: 25,
  optimism: 10,
  celo: 42220,
  aurora: 1313161554,
  eluvio: 955305,
  alfajores: 44787,
  xdc: 50,
  evmos: 9001,
  evmosTestnet: 9000,
  hardhat: 31337,
};

export enum CHAIN_NAME {
  "ethereum",
  "polygon",
  "fantom",
  "xdai",
  "bsc",
  "arbitrum",
  "avalanche",
  "fuji",
  "harmony",
  "kovan",
  "mumbai",
  "goerli",
  "ropsten",
  "rinkeby",
  "cronos",
  "optimism",
  "celo",
  "aurora",
  "eluvio",
  "alfajores",
  "xdc",
  "evmos",
  "evmosTestnet",
  "hardhat",
}

export type LitUnsignedTransaction = UnsignedTransaction & { from: string };

export interface UTXO {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
  value: number;
}
