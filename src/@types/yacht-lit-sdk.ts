import { LitAuthSig } from "./../utils/lit";

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

export type LitERC20SwapConditionParams = {
  contractAddress: string;
  chain: string;
  amount: string;
  decimals: number;
};

export interface LitActionsSDK {
  checkConditions: ({
    conditions,
    authSig,
    chain,
  }: {
    conditions: LitERC20SwapCondition[];
    authSig: LitAuthSig;
    chain: string;
  }) => Promise<boolean>;

  signEcdsa: ({
    toSign,
    publicKey,
    sigName,
  }: {
    toSign: Uint8Array;
    publicKey: string;
    sigName: string;
  }) => Promise<void>;

  getLatestNonce: (chain: string) => Promise<number>;

  setResponse: ({ response }: { response: string }) => void;
}

export const LitChainIds = {
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
};
