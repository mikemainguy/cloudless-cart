# Cloudless Cart

A TypeScript library for creating distributed, secure shopping carts with cryptographic protection using JOSE (JSON Object Signing and Encryption).

## Security Approaches Overview

Cloudless Cart supports three different security approaches for protecting shopping cart data. Choose the approach that best fits your security requirements and performance needs.

### When to Use Each Approach

| Approach | Use When | Pros | Cons |
|----------|----------|------|------|
| **Signed Only** | - Internal systems<br>- High performance needed<br>- Data confidentiality not required | ✅ Fast performance<br>✅ Data integrity<br>✅ Non-repudiation<br>✅ Simple key management | ❌ Data visible to anyone<br>❌ No confidentiality |
| **Sign-then-Encrypt** | - Standard compliance needed<br>- Following established protocols<br>- Simple implementation | ✅ Both integrity and confidentiality<br>✅ Industry standard approach<br>✅ Non-repudiation on original data | ❌ Vulnerable to signature oracle attacks<br>❌ Potential surreptitious forwarding<br>❌ Larger payload size |
| **Encrypt-then-Sign** | - **Recommended for most cases**<br>- Maximum security needed<br>- Web applications<br>- Untrusted networks | ✅ **Best security model**<br>✅ Prevents signature oracle attacks<br>✅ Fast signature verification<br>✅ Better performance characteristics | ❌ Slightly weaker non-repudiation<br>❌ More complex implementation |

## Quick Start

```bash
npm install cloudless-cart
```

## Usage Examples

### Basic Setup

```typescript
import { CloudlessCrypto } from 'cloudless-cart';

const crypto = new CloudlessCrypto();

// Generate keys (do this once and store securely)
const signingKeyPair = await crypto.generateSigningKeyPair();
const encryptionKeyPair = await crypto.generateEncryptionKeyPair();

const signingKey = signingKeyPair.key;
const encryptionKey = encryptionKeyPair.key;
```

### Approach 1: Signed Cart (Unencrypted)

**Use for:** Internal systems, high-performance scenarios where data confidentiality is not required.

```typescript
import { CloudlessCrypto } from 'cloudless-cart';

const crypto = new CloudlessCrypto();
const signingKey = (await crypto.generateSigningKeyPair()).key;

// Create and sign a cart
const cartData = {
  userId: 'user123',
  items: [
    { id: 'book-1', name: 'JavaScript Guide', price: 29.99, qty: 1 },
    { id: 'pen-1', name: 'Blue Pen', price: 2.99, qty: 3 }
  ],
  subtotal: 38.97,
  tax: 3.12,
  total: 42.09,
  timestamp: Date.now()
};

// Sign the cart data
const signedCart = await crypto.signObject(signingKey, cartData);
console.log('Signed cart:', signedCart);

// Verify the cart data
const verifiedCart = await crypto.verifyObject(signedCart, signingKey);
console.log('Verified cart:', verifiedCart);

// ⚠️ Note: Cart data is visible in plaintext in the signed token
console.log('Visible payload:', signedCart.payload);
```

### Approach 2: Sign-then-Encrypt (Traditional)

**Use for:** When following established protocols or standards, moderate security requirements.

```typescript
import { CloudlessCrypto } from 'cloudless-cart';

const crypto = new CloudlessCrypto();
const signingKey = (await crypto.generateSigningKeyPair()).key;
const encryptionKey = (await crypto.generateEncryptionKeyPair()).key;

const cartData = {
  userId: 'user123',
  items: [
    { id: 'laptop-1', name: 'MacBook Pro', price: 2399.99, qty: 1 }
  ],
  total: 2399.99,
  timestamp: Date.now()
};

// Step 1: Sign the cart, then encrypt the signed result
const signThenEncryptToken = await crypto.signAndEncrypt(
  signingKey,
  encryptionKey, 
  cartData,
  {
    audience: 'shopping-app',
    expirationTime: '2h'
  }
);

console.log('Sign-then-encrypt token:', signThenEncryptToken);
// Result is an encrypted JWT string

// Step 2: Decrypt then verify
const decryptedCart = await crypto.decryptAndVerify(
  encryptionKey,
  signingKey,
  signThenEncryptToken
);

console.log('Decrypted and verified cart:', decryptedCart);
```

### Approach 3: Encrypt-then-Sign (Recommended)

**Use for:** Maximum security, web applications, production systems with high security requirements.

```typescript
import { CloudlessCrypto } from 'cloudless-cart';

const crypto = new CloudlessCrypto();
const signingKey = (await crypto.generateSigningKeyPair()).key;
const encryptionKey = (await crypto.generateEncryptionKeyPair()).key;

const cartData = {
  userId: 'user123',
  creditCardLast4: '1234', // Sensitive data
  items: [
    { id: 'diamond-ring', name: 'Diamond Ring', price: 5999.99, qty: 1 }
  ],
  shippingAddress: {
    street: '123 Main St',
    city: 'Anytown',
    zip: '12345'
  },
  total: 5999.99,
  timestamp: Date.now()
};

// Step 1: Encrypt the cart, then sign the encrypted result
const encryptThenSignToken = await crypto.encryptThenSign(
  encryptionKey,
  signingKey,
  cartData,
  {
    audience: 'secure-checkout',
    expirationTime: '1h',
    issuer: 'shopping-service'
  }
);

console.log('Encrypt-then-sign token:', encryptThenSignToken);
// Result is a JWS object containing encrypted payload

// Verify the token structure (no sensitive data exposed)
console.log('Token structure:', {
  hasSignature: !!encryptThenSignToken.signature,
  hasEncryptedPayload: !!encryptThenSignToken.payload.encrypted,
  hasPayloadHash: !!encryptThenSignToken.payload.payloadHash,
  timestamp: encryptThenSignToken.payload.timestamp
});
// ✅ No sensitive cart data visible in the token structure

// Step 2: Verify signature then decrypt
const verifiedCart = await crypto.verifyThenDecrypt(
  signingKey,
  encryptionKey,
  encryptThenSignToken
);

console.log('Verified and decrypted cart:', verifiedCart);
```

## Complete Shopping Cart Example

```typescript
import { CloudlessCart, CloudlessCrypto, JsonSignature } from 'cloudless-cart';

// Method 1: Using the original CloudlessCart class (signed only)
const cart = new CloudlessCart();
const signer = new JsonSignature();
await signer.generateKeyPair();

cart.setSigner(signer);
cart.addItem({ name: 'Book', price: 19.99 });
cart.addItem({ name: 'Pen', price: 2.99 });

const signedCart = await cart.signedCart();
console.log('Traditional signed cart:', signedCart);

// Method 2: Using CloudlessCrypto for advanced security
const crypto = new CloudlessCrypto();
const keys = {
  signing: (await crypto.generateSigningKeyPair()).key,
  encryption: (await crypto.generateEncryptionKeyPair()).key
};

const cartData = {
  sessionId: 'sess_' + Date.now(),
  items: cart.getItems(),
  total: cart.getItems().reduce((sum, item) => sum + item.price, 0)
};

// Choose your security approach:

// Option A: Maximum security (recommended)
const secureToken = await crypto.encryptThenSign(
  keys.encryption,
  keys.signing,
  cartData,
  { expirationTime: '30m' }
);

// Option B: Traditional approach  
const traditionalToken = await crypto.signAndEncrypt(
  keys.signing,
  keys.encryption,
  cartData,
  { expirationTime: '30m' }
);

// Verification
const verifiedSecure = await crypto.verifyThenDecrypt(
  keys.signing,
  keys.encryption,
  secureToken
);

const verifiedTraditional = await crypto.decryptAndVerify(
  keys.encryption,
  keys.signing,
  traditionalToken
);

console.log('Both methods produce equivalent results:', 
  JSON.stringify(verifiedSecure) === JSON.stringify(verifiedTraditional)
);
```

## Key Management

### Generating and Storing Keys

```typescript
const crypto = new CloudlessCrypto();

// Generate keys
const signingKeyPair = await crypto.generateSigningKeyPair();
const encryptionKeyPair = await crypto.generateEncryptionKeyPair();

// Export keys for storage
const signingKeyExport = await crypto.signer.exportKeyPair(signingKeyPair.key);
const encryptionKeyExport = await crypto.encryptor.exportKeyPair(encryptionKeyPair.key);

// Store keys securely (example - use proper key management in production)
const keyStore = {
  signing: {
    id: signingKeyExport.kid,
    publicKey: signingKeyExport.publicKey,
    privateKey: signingKeyExport.privateKey, // Store securely!
    algorithm: signingKeyExport.alg
  },
  encryption: {
    id: encryptionKeyExport.kid,
    publicKey: encryptionKeyExport.publicKey,
    privateKey: encryptionKeyExport.privateKey, // Store securely!
    algorithm: encryptionKeyExport.alg
  }
};

// Later: Import keys from storage
const newCrypto = new CloudlessCrypto();

await newCrypto.signer.importKeyPair(
  keyStore.signing.id,
  keyStore.signing.publicKey,
  keyStore.signing.privateKey,
  keyStore.signing.algorithm!
);

await newCrypto.encryptor.importKeyPairForEncryption(
  keyStore.encryption.id,
  keyStore.encryption.publicKey,
  keyStore.encryption.privateKey,
  keyStore.encryption.algorithm!
);
```

### Separate Keys for Different Users

```typescript
const crypto = new CloudlessCrypto();

// Generate keys per user/role
const adminKeys = {
  signing: (await crypto.generateSigningKeyPair()).key,
  encryption: (await crypto.generateEncryptionKeyPair()).key
};

const customerKeys = {
  signing: (await crypto.generateSigningKeyPair()).key,
  encryption: (await crypto.generateEncryptionKeyPair()).key
};

// Admin creates a cart
const adminCart = { role: 'admin', permissions: ['read', 'write', 'delete'] };
const adminToken = await crypto.encryptThenSign(
  adminKeys.encryption,
  adminKeys.signing,
  adminCart
);

// Customer creates a cart  
const customerCart = { role: 'customer', items: ['book'], total: 19.99 };
const customerToken = await crypto.encryptThenSign(
  customerKeys.encryption,
  customerKeys.signing,
  customerCart
);

// Verify with appropriate keys
const verifiedAdmin = await crypto.verifyThenDecrypt(
  adminKeys.signing,
  adminKeys.encryption,
  adminToken
);

const verifiedCustomer = await crypto.verifyThenDecrypt(
  customerKeys.signing,
  customerKeys.encryption,
  customerToken
);
```

## Security Best Practices

### 1. Key Rotation
```typescript
// Rotate encryption keys regularly
const oldEncryptionKey = 'key-2023-01';
const newEncryptionKey = (await crypto.generateEncryptionKeyPair()).key;

// Keep signing keys longer for token verification
const signingKey = 'stable-signing-key';

// New tokens use new encryption key
const newToken = await crypto.encryptThenSign(newEncryptionKey, signingKey, data);

// Old tokens can still be verified with old key
const oldToken = await crypto.verifyThenDecrypt(signingKey, oldEncryptionKey, oldData);
```

### 2. Token Expiration
```typescript
// Short-lived tokens for sensitive operations
const checkoutToken = await crypto.encryptThenSign(
  encryptionKey,
  signingKey,
  cartData,
  { 
    expirationTime: '5m', // 5 minutes for checkout
    audience: 'payment-processor'
  }
);

// Longer-lived tokens for cart persistence
const cartToken = await crypto.encryptThenSign(
  encryptionKey,
  signingKey,
  cartData,
  { 
    expirationTime: '24h', // 24 hours for cart storage
    audience: 'shopping-cart'
  }
);
```

### 3. Environment-Specific Keys
```typescript
const environment = process.env.NODE_ENV;

const keyConfig = {
  development: {
    signingAlgorithm: 'PS256',
    encryptionAlgorithm: 'RSA-OAEP-256'
  },
  production: {
    signingAlgorithm: 'PS512',   // Stronger algorithm
    encryptionAlgorithm: 'RSA-OAEP-384'  // Stronger algorithm
  }
};

const config = keyConfig[environment] || keyConfig.development;

const signingKey = await crypto.generateSigningKeyPair(config.signingAlgorithm);
const encryptionKey = await crypto.generateEncryptionKeyPair(config.encryptionAlgorithm);
```

## API Reference

### CloudlessCrypto Class

#### Key Generation
- `generateSigningKeyPair(alg?)` - Generate key pair for signing operations
- `generateEncryptionKeyPair(alg?)` - Generate key pair for encryption operations

#### Signed Only (No Encryption)
- `signObject(key, obj)` - Sign an object
- `verifyObject(signed, key?)` - Verify a signed object

#### Sign-then-Encrypt (Traditional)
- `signAndEncrypt(signingKey, encryptionKey, payload, options?)` - Sign then encrypt
- `decryptAndVerify(encryptionKey, signingKey, token)` - Decrypt then verify

#### Encrypt-then-Sign (Recommended)
- `encryptThenSign(encryptionKey, signingKey, payload, options?)` - Encrypt then sign
- `verifyThenDecrypt(signingKey, encryptionKey, token)` - Verify then decrypt

#### Direct Encryption/Decryption
- `encryptToken(key, payload, options?)` - Encrypt a payload
- `decryptToken(key, token)` - Decrypt a token

### CloudlessCart Class (Legacy)

#### Basic Operations
- `addItem(item)` - Add item to cart
- `getItems()` - Get all cart items
- `clearCart()` - Clear all items

#### Signing
- `setSigner(signer)` - Set JsonSignature instance
- `signedCart()` - Get signed cart with key pair
- `verifyCart(cart, key)` - Verify a signed cart

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.