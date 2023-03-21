import { PKP_CONTRACT_ADDRESS_MUMBAI } from "./../src/constants/index";
import { YachtLitSdk } from "../src";
import { ethers, Wallet } from "ethers";

describe("Bitcoin Address Testnet Generation", () => {
  const sdk = new YachtLitSdk({
    btcTestNet: true,
  });
  let wallet: Wallet;
  const btcTestNetRegex = new RegExp(/^(m|n|2)[1-9A-Za-z][^OIl]{25,34}$/);
  beforeEach(() => {
    wallet = Wallet.createRandom();
  });

  it("Should generate a valid bitcoin testnet address from an uncompressed hex encoded Ethereum public key", () => {
    const btcAddress = sdk.getPkpBtcAddress(wallet.publicKey);
    expect(btcTestNetRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should generate a valid bitcoin testnet address from an uncompressed Ethereum public key without hex encoding characters", () => {
    const nonHexPubKey = wallet.publicKey.replace("0x", "");
    const btcAddress = sdk.getPkpBtcAddress(nonHexPubKey);
    expect(btcTestNetRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should generate a valid bitcoin testnet address for a compressed Ethereum public key", () => {
    const compressed = ethers.utils.computePublicKey(wallet.publicKey, true);
    const btcAddress = sdk.getPkpBtcAddress(compressed);
    expect(btcTestNetRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should generate a valid bitcoin testnet address from a compressed Ethereum public key without hex encoding characters", () => {
    const compressed = ethers.utils.computePublicKey(wallet.publicKey, true);
    const nonHexPubKey = compressed.replace("0x", "");
    const btcAddress = sdk.getPkpBtcAddress(nonHexPubKey);
    expect(btcTestNetRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should error on invalid keys", () => {
    expect(() => sdk.getPkpBtcAddress(wallet.publicKey.slice(3))).toThrow();
    expect(() => sdk.getPkpBtcAddress("shouldThrow")).toThrow();
  });

  it("They all generate the same testnet address", () => {
    const uncompressedHex = sdk.getPkpBtcAddress(wallet.publicKey);

    const nonHexPubKey = wallet.publicKey.replace("0x", "");
    const uncompressed = sdk.getPkpBtcAddress(nonHexPubKey);

    const compressed = ethers.utils.computePublicKey(wallet.publicKey, true);
    const compressedHex = sdk.getPkpBtcAddress(compressed);

    const a = ethers.utils.computePublicKey(wallet.publicKey, true);
    const b = a.replace("0x", "");
    const compressedNoHex = sdk.getPkpBtcAddress(b);

    expect(
      uncompressedHex === uncompressed &&
        uncompressedHex === compressedHex &&
        uncompressedHex === compressedNoHex,
    ).toBeTruthy();
  });
});

describe("Bitcoin Address Mainnet Generation", () => {
  const sdk = new YachtLitSdk({});
  let wallet: Wallet;
  const btcAddressRegex = new RegExp(/^(bc1|[13])[a-km-zA-HJ-NP-Z1-9]{25,34}$/);

  beforeEach(() => {
    wallet = Wallet.createRandom();
  });

  it("Should generate a valid bitcoin address from an uncompressed hex encoded Ethereum public key", () => {
    const btcAddress = sdk.getPkpBtcAddress(wallet.publicKey);
    expect(btcAddressRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should generate a valid bitcoin address from an uncompressed Ethereum public key without hex encoding characters", () => {
    const nonHexPubKey = wallet.publicKey.replace("0x", "");
    const btcAddress = sdk.getPkpBtcAddress(nonHexPubKey);
    expect(btcAddressRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should generate a valid bitcoin address for a compressed Ethereum public key", () => {
    const compressed = ethers.utils.computePublicKey(wallet.publicKey, true);
    const btcAddress = sdk.getPkpBtcAddress(compressed);
    expect(btcAddressRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should generate a valid bitcoin address from a compressed Ethereum public key without hex encoding characters", () => {
    const compressed = ethers.utils.computePublicKey(wallet.publicKey, true);
    const nonHexPubKey = compressed.replace("0x", "");
    const btcAddress = sdk.getPkpBtcAddress(nonHexPubKey);
    expect(btcAddressRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should error on invalid keys", () => {
    expect(() => sdk.getPkpBtcAddress(wallet.publicKey.slice(3))).toThrow();
    expect(() => sdk.getPkpBtcAddress("shouldThrow")).toThrow();
  });

  it("They all generate the same address", () => {
    const uncompressedHex = sdk.getPkpBtcAddress(wallet.publicKey);

    const nonHexPubKey = wallet.publicKey.replace("0x", "");
    const uncompressed = sdk.getPkpBtcAddress(nonHexPubKey);

    const compressed = ethers.utils.computePublicKey(wallet.publicKey, true);
    const compressedHex = sdk.getPkpBtcAddress(compressed);

    const a = ethers.utils.computePublicKey(wallet.publicKey, true);
    const b = a.replace("0x", "");
    const compressedNoHex = sdk.getPkpBtcAddress(b);

    expect(
      uncompressedHex === uncompressed &&
        uncompressedHex === compressedHex &&
        uncompressedHex === compressedNoHex,
    ).toBeTruthy();
  });
});
