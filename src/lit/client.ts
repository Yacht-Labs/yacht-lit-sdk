import LitJsSdk from "@lit-protocol/sdk-nodejs";

const client = new LitJsSdk.LitNodeClient();

export class Lit {
  private litNodeClient: any;
  async connect(network?: string) {
    await client.connect(network);
    this.litNodeClient = client;
  }
}

export default new Lit();
