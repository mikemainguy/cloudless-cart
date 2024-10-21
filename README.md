# Cloudless Cart

Generic class to store a list of items,
sign them, and verify the signature.

Uses the `cryptography` library to sign and verify the items.
## Intent
many only shopping experiences rely on a centralized
"cart" databse to store and retrieve data.  This library allows for passing a cart
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

## Exporting and Importing a keypair

```typescript
//create new keypair, export, and store somewhere secure
import { JsonSignature } from 'cloudless-cart';
const composer = new JsonSignature();
const keypair = await composer.generateKeyPair();
const pair = await composer.exportKeyPair(keypair.key);

//import the keypair on another machine, process/whatever
const composer2 = new JsonSignature();
await composer2.importKeyPair(keypair.key, pair.public, pair.private, pair.alg as string);
```

