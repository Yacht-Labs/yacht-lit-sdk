import { PKP_CONTRACT_ADDRESS_MUMBAI } from "./../src/constants/index";
import { YachtLitSdk } from "../src";
import { ethers, Wallet } from "ethers";

describe("Bitcoin Address Testnet Generation", () => {
  const sdk = new YachtLitSdk(
    Wallet.createRandom(),
    PKP_CONTRACT_ADDRESS_MUMBAI,
    true,
  );
  let wallet: Wallet;
  const btcTestNetRegex = new RegExp(/^(m|n|2)[1-9A-Za-z][^OIl]{25,34}$/);
  beforeEach(() => {
    wallet = Wallet.createRandom();
  });

  it("Should generate a valid bitcoin testnet address from an uncompressed hex encoded Ethereum public key", () => {
    const btcAddress = sdk.ethPubKeyToBtcAddress(wallet.publicKey);
    expect(btcTestNetRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should generate a valid bitcoin testnet address from an uncompressed Ethereum public key without hex encoding characters", () => {
    const nonHexPubKey = wallet.publicKey.replace("0x", "");
    const btcAddress = sdk.ethPubKeyToBtcAddress(nonHexPubKey);
    expect(btcTestNetRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should generate a valid bitcoin testnet address for a compressed Ethereum public key", () => {
    const compressed = ethers.utils.computePublicKey(wallet.publicKey, true);
    const btcAddress = sdk.ethPubKeyToBtcAddress(compressed);
    expect(btcTestNetRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should generate a valid bitcoin testnet address from a compressed Ethereum public key without hex encoding characters", () => {
    const compressed = ethers.utils.computePublicKey(wallet.publicKey, true);
    const nonHexPubKey = compressed.replace("0x", "");
    const btcAddress = sdk.ethPubKeyToBtcAddress(nonHexPubKey);
    expect(btcTestNetRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should error on invalid keys", () => {
    expect(() =>
      sdk.ethPubKeyToBtcAddress(wallet.publicKey.slice(3)),
    ).toThrow();
    expect(() => sdk.ethPubKeyToBtcAddress("shouldThrow")).toThrow();
  });

  it("They all generate the same testnet address", () => {
    const uncompressedHex = sdk.ethPubKeyToBtcAddress(wallet.publicKey);

    const nonHexPubKey = wallet.publicKey.replace("0x", "");
    const uncompressed = sdk.ethPubKeyToBtcAddress(nonHexPubKey);

    const compressed = ethers.utils.computePublicKey(wallet.publicKey, true);
    const compressedHex = sdk.ethPubKeyToBtcAddress(compressed);

    const a = ethers.utils.computePublicKey(wallet.publicKey, true);
    const b = a.replace("0x", "");
    const compressedNoHex = sdk.ethPubKeyToBtcAddress(b);

    expect(
      uncompressedHex === uncompressed &&
        uncompressedHex === compressedHex &&
        uncompressedHex === compressedNoHex,
    ).toBeTruthy();
  });
});

describe("Bitcoin Address Mainnet Generation", () => {
  const sdk = new YachtLitSdk();
  let wallet: Wallet;
  const btcAddressRegex = new RegExp(/^(bc1|[13])[a-km-zA-HJ-NP-Z1-9]{25,34}$/);

  beforeEach(() => {
    wallet = Wallet.createRandom();
  });

  it("Should generate a valid bitcoin address from an uncompressed hex encoded Ethereum public key", () => {
    const btcAddress = sdk.ethPubKeyToBtcAddress(wallet.publicKey);
    expect(btcAddressRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should generate a valid bitcoin address from an uncompressed Ethereum public key without hex encoding characters", () => {
    const nonHexPubKey = wallet.publicKey.replace("0x", "");
    const btcAddress = sdk.ethPubKeyToBtcAddress(nonHexPubKey);
    expect(btcAddressRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should generate a valid bitcoin address for a compressed Ethereum public key", () => {
    const compressed = ethers.utils.computePublicKey(wallet.publicKey, true);
    const btcAddress = sdk.ethPubKeyToBtcAddress(compressed);
    expect(btcAddressRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should generate a valid bitcoin address from a compressed Ethereum public key without hex encoding characters", () => {
    const compressed = ethers.utils.computePublicKey(wallet.publicKey, true);
    const nonHexPubKey = compressed.replace("0x", "");
    const btcAddress = sdk.ethPubKeyToBtcAddress(nonHexPubKey);
    expect(btcAddressRegex.test(btcAddress)).toBeTruthy();
  });

  it("Should error on invalid keys", () => {
    expect(() =>
      sdk.ethPubKeyToBtcAddress(wallet.publicKey.slice(3)),
    ).toThrow();
    expect(() => sdk.ethPubKeyToBtcAddress("shouldThrow")).toThrow();
  });

  it("They all generate the same address", () => {
    const uncompressedHex = sdk.ethPubKeyToBtcAddress(wallet.publicKey);

    const nonHexPubKey = wallet.publicKey.replace("0x", "");
    const uncompressed = sdk.ethPubKeyToBtcAddress(nonHexPubKey);

    const compressed = ethers.utils.computePublicKey(wallet.publicKey, true);
    const compressedHex = sdk.ethPubKeyToBtcAddress(compressed);

    const a = ethers.utils.computePublicKey(wallet.publicKey, true);
    const b = a.replace("0x", "");
    const compressedNoHex = sdk.ethPubKeyToBtcAddress(b);

    expect(
      uncompressedHex === uncompressed &&
        uncompressedHex === compressedHex &&
        uncompressedHex === compressedNoHex,
    ).toBeTruthy();
  });
});
