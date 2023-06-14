import * as dotenv from "dotenv";
dotenv.config();

// function that reads a string environment variable and throws if it is not set
export const readEnv = (name: string): string => {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
};

export const getMumbaiPrivateKey = (): string => {
  return readEnv("MUMBAI_PRIVATE_KEY");
};

export const getGoerliPrivateKey = (): string => {
  return readEnv("GOERLI_PRIVATE_KEY");
};

export const getGoerliProviderUrl = (): string => {
  return readEnv("GOERLI_PROVIDER_URL");
};

export const getMumbaiProviderUrl = (): string => {
  return readEnv("MUMBAI_PROVIDER_URL");
};

export const getBitcoinAddress = (): string => {
  return readEnv("BITCOIN_TESTNET_ADDRESS");
};

export const getLitProviderUrl = (): string => {
  return readEnv("LIT_RPC_PROVIDER_URL");
};

export const getLitPrivateKey = (): string => {
  return readEnv("LIT_PRIVATE_KEY");
};
