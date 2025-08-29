import { CloudlessCart, JsonSignature } from '../src';

void describe('index', () => {
  void it('adding a single string should return a single item array', () => {
    const cart = new CloudlessCart();
    cart.addItem({ name: 'item', price: 10 });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    expect(cart.getItems()).toEqual([{ name: 'item', price: 10 }]);
  });
  void it('adding a single object should return a single item array', () => {
    const cart = new CloudlessCart();
    const item = {
      name: 'item',
      price: 10,
    };

    cart.addItem(item);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    expect(cart.getItems()).toEqual([item]);
  });
  void it('clearing items should work', () => {
    const cart = new CloudlessCart();
    const item = {
      name: 'item',
      price: 10,
    };

    cart.addItem(item);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(cart.getItems()).toEqual([item]);
    cart.clearCart();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(cart.getItems()).toEqual([]);
  });
  void it('should throw an error if no signer is set', async () => {
    const cart = new CloudlessCart();
    cart.addItem({ name: 'item', price: 10 });
    await expect(cart.signedCart()).rejects.toThrow('No signer set');
  });
  void it('should return signed cart is signer is set', async () => {
    const cart = new CloudlessCart();
    const signer = new JsonSignature();
    await signer.generateKeyPair();
    cart.addItem({ name: 'item', price: 10 });
    cart.setSigner(signer);
    const signed = await cart.signedCart();
    expect(signed).toBeDefined();
    expect(signed.signed).toBeDefined();
    expect(signed.signed.payload.items).toEqual(cart.getItems());
  });
  void it('should be able to verify cart', async () => {
    const cart = new CloudlessCart();
    const signer = new JsonSignature();
    await signer.generateKeyPair();

    cart.addItem({ name: 'item', price: 10 });
    cart.setSigner(signer);
    const signed = await cart.signedCart();
    expect(signed).toBeDefined();
    const verifiedCart = await cart.verifyCart(
      signed.signed,
      signed.keypair.key
    );
    expect(verifiedCart.items).toEqual(cart.getItems());
  });
  void it('should throw an error if no signer is set', async () => {
    const cart = new CloudlessCart();
    const signed = {
      signature: 'signature',
      protected: 'protected',
      payload: {},
    };
    await expect(cart.verifyCart(signed, 'foo')).rejects.toThrow(
      'No signer set'
    );
  });
});
