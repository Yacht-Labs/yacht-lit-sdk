import { create } from "ipfs-core";

export interface IPFSData {
  path: string;
  url: string;
}
/**
   * 
   * Upload code to IPFS
   * 
   * @example
   * ```
   const code = `
      const go = async () => {
          const sigShare = await LitActions.signEcdsa({ toSign, keyId, sigName });
      };
      go();
  `;
  const ipfsData  = await uploadToIPFS(code);
  console.log("ipfsData:", ipfsData);
  ```
  * 
  * @param { string } code
  * @returns { IPFSData } 
  */
export const uploadToIPFS = async (code: string): Promise<IPFSData> => {
  const ipfs = await create({ repo: "ok" + Math.random() });

  const { path } = await ipfs.add(code);

  const data: IPFSData = {
    path: path,
    url: `https://ipfs.litgateway.com/ipfs/${path}`,
  };

  return data;
};
