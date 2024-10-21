import JsonSignature from './jsonSignature';

export class CloudlessCart {
  private readonly items: any[];
  private signer: JsonSignature | null = null;

  public constructor() {
    this.items = [];
  }

  public addItem(item: any): void {
    this.items.push(item);
  }

  public getItems(): any[] {
    return this.items;
  }

  public clearCart(): void {
    this.items.length = 0;
  }

  public setSigner(signer: JsonSignature): void {
    this.signer = signer;
  }

  public async signedCart(): Promise<any> {
    if (!this.signer) {
      throw new Error('No signer set');
    }
    const cart = {
      items: this.items,
    };
    const pair = await this.signer.generateKeyPair();
    const signed = await this.signer.sign(pair.key, cart);
    return {
      signed: signed,
      keypair: pair,
    };
  }

  public async verifyCart(cart: any, key: string): Promise<any> {
    if (!this.signer) {
      throw new Error('No signer set');
    }
    return await this.signer.verify(cart, key);
  }
}
