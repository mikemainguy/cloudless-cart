import { CloudlessCart } from '../src';

void describe('index', () => {
  void it('adding a single string should return a single item array', () => {
    const cart = new CloudlessCart();
    cart.addItem('item');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    expect(cart.getItems()).toEqual(['item']);
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
});
