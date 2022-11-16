import LitJsSdk from "@lit-protocol/sdk-nodejs";

const client = new LitJsSdk.LitNodeClient();

class Lit {
  private litNodeClient: any;
  async connect() {
    await client.connect();
    this.litNodeClient = client;
  }
}

export default new Lit();
