import {
  LitBtcSwapParams,
  LitEVMNativeSwapCondition,
  LitEthSwapParams,
} from "../src";
import { YachtLitSdk } from "../src";

const sdk = new YachtLitSdk({ btcTestNet: true });
export const btcSwapParams: LitBtcSwapParams = {
  counterPartyAddress:
    "tb1palt6npxah07t92ylud0ls0mwqak5jwneuckqecsww5935usx5g7sggxm7a",
  network: "testnet",
  value: 8000,
  ethAddress: "0xe0d2f75cf0657d5c136708e0867afd9409945Bc2",
};

export const ethParams: LitEthSwapParams = {
  counterPartyAddress: "0xF4cA21Df3009b640b6c6efEEEc7BD7640A97aF15",
  chain: "mumbai",
  amount: "10",
  btcAddress: "tb1palt6npxah07t92ylud0ls0mwqak5jwneuckqecsww5935usx5g7sggxm7a",
};

export const evmConditions: LitEVMNativeSwapCondition =
  sdk.generateEVMNativeSwapCondition(ethParams);

export const evmTransaction = sdk.generateUnsignedEVMNativeTransaction({
  ...ethParams,
  counterPartyAddress: btcSwapParams.ethAddress,
});

export const evmClawbackTransaction = sdk.generateUnsignedEVMNativeTransaction({
  ...ethParams,
  counterPartyAddress: ethParams.counterPartyAddress,
});

export const successHash = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
export const clawbackHash = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
export const successTxHex = "0x1234";
export const clawbackTxHex = "0x5678";
