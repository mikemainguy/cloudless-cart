# Cloudless Cart

Generic class to store a list of items,
sign them, and verify the signature.

Uses the `cryptography` library to sign and verify the items.
## Intent
many online shopping experiences rely on a centralized
"cart" database to store and retrieve data.  This library allows for passing a cart
around to different services without having to worry about the
backend state of the cart.  This is useful to decouple systems in a 
microservices ecosystem.

The main "cart" service can interact with the cart and sign it
and other systems can verify integrity without calling back to 
main database.

JsonSignature can be used by itself to sign and verify any arbitrary json object.
## Usage

```typescript

import { CloudlessCart, JsonSignature } from 'cloudless-cart';
//create a new cart
const cart = new CloudlessCart();
//create a new signer
const signer = new JsonSignature();
//generate a new keypair 
// (note: this is unique to this instance see 
//below for how to export/import a keypair)
await signer.generateKeyPair();
//set the signer
cart.setSigner(signer);
//add some stuff to the cart
cart.addItem({ name: 'item', price: 10 });
//sign the cart, this "signed" cart can be passed around
// freely and verified by anyone 
// (note: the private key is stored in the keypair object)
// you don't want anyone to have this as they can then
// sign anything as you
const signed = await cart.signedCart();
//verify the cart is authentic and unchanged
const verifiedCart = await cart.verifyCart(
  signed.signed,
  signed.keypair.key
);

```

Signed cart will be json that looks like this:
```json
      {
        signature: 'Bb28VIN1E5HdTHrtqOocy9ZZxLQjpuBq8KGFfDlqRfsJ5TOmNmmkQlgEmV5YZ1BGUvy1U2fJUVN2dTat02koE99BVJOQfNCfa2XDyyz0wWT5h66izA8jfnUrV5sywXy5t2OUKgo-ub4fXMo9GQDC7OUhQeiyy2-DGQrquwyCuTu4WOS538KayuOoBTYoB5JlRj6IZBgf12ae1BFvYXYcQTwT3U3JR6q-swi02AIU2t2H5DjZgUetCedZC0ObcPl7v6VGP2RPHMCmPK17puz8hEnQU1TP1hCFP6aiSPeZ7uqkwjDpRw1mQIW3a-bowMkthUl8610Yb18Z0f70IQ2Bgg',
        protected: 'eyJhbGciOiJQUzI1NiIsImtpZCI6ImYxZmM2YzZlLWU0NGUtNDUzMS1hNGY1LWM2N2ZiNWQzYTRjYyIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19',
        payload: { id: 1, message: 'hello' }
      }

```

public key will be JWK that looks like this:

```json
      {
        signature: 'Bb28VIN1E5HdTHrtqOocy9ZZxLQjpuBq8KGFfDlqRfsJ5TOmNmmkQlgEmV5YZ1BGUvy1U2fJUVN2dTat02koE99BVJOQfNCfa2XDyyz0wWT5h66izA8jfnUrV5sywXy5t2OUKgo-ub4fXMo9GQDC7OUhQeiyy2-DGQrquwyCuTu4WOS538KayuOoBTYoB5JlRj6IZBgf12ae1BFvYXYcQTwT3U3JR6q-swi02AIU2t2H5DjZgUetCedZC0ObcPl7v6VGP2RPHMCmPK17puz8hEnQU1TP1hCFP6aiSPeZ7uqkwjDpRw1mQIW3a-bowMkthUl8610Yb18Z0f70IQ2Bgg',
        protected: 'eyJhbGciOiJQUzI1NiIsImtpZCI6ImYxZmM2YzZlLWU0NGUtNDUzMS1hNGY1LWM2N2ZiNWQzYTRjYyIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19',
        payload: { id: 1, message: 'hello' }
      }
```

In the example, we overrode the default generated kid with 'testtest',
you can also not set any kid and import the public key with the kid in
the JWS header and it will work fine.

## Exporting and Importing a keypair

```typescript
//create new keypair, export, and store somewhere secure
const composer = new JsonSignature();
const keypair = await composer.generateKeyPair();
//export the public key so folks verifying can use it
const pubKey = await composer.getPublicKey(keypair.key);
const message = { message: 'hello', id: 1 };
const signed = await composer.sign(keypair.key, message);

//import the public key and verify the message (in browser, another system, whatever)
const composer2 = new JsonSignature();
await composer2.setPublicKey('testtest', pubKey);
const verified = await composer2.verify(signed, 'testtest');
expect(verified).toEqual(message);
```

