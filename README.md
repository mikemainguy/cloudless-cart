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

## Public Key Verification

One of the key benefits of this cryptographic approach is that **signature verification only requires the public key**, not the private key. This enables secure, distributed verification without sharing sensitive key material.

### How Public Key Verification Works

```typescript
import { CloudlessCrypto } from 'cloudless-cart';

// === SERVICE A: Cart Creation (has private key) ===
const cartService = new CloudlessCrypto();
const keyPair = await cartService.generateSigningKeyPair();
const privateKeyId = keyPair.key;
const publicKeyJWK = keyPair.publicKey;

// Cart service signs the cart with private key
const cartData = { userId: 'user123', items: ['book'], total: 19.99 };
const signedCart = await cartService.signObject(privateKeyId, cartData);

console.log('Signed cart from service A:', signedCart);

// === SERVICE B: Verification (only has public key) ===
const verificationService = new CloudlessCrypto();

// Import ONLY the public key (private key never shared)
await verificationService.signer.setPublicKey('public-key-id', publicKeyJWK);

// Service B can verify the cart was signed by Service A
const verifiedCart = await verificationService.verifyObject(signedCart, 'public-key-id');
console.log('Verified cart in service B:', verifiedCart);

// ✅ Verification succeeds - Service B knows the cart is authentic
// ❌ Service B cannot create new signed carts (no private key)
```

### Encrypt-then-Sign with Public Key Distribution

```typescript
// === CART SERVICE: Creates and signs carts ===
const cartService = new CloudlessCrypto();
const signingKeys = await cartService.generateSigningKeyPair();
const encryptionKeys = await cartService.generateEncryptionKeyPair();

const cartData = {
  userId: 'customer123',
  items: [{ name: 'Premium Widget', price: 99.99 }],
  creditCard: '****-****-****-1234' // Sensitive data
};

// Create encrypted and signed token
const secureToken = await cartService.encryptThenSign(
  encryptionKeys.key,
  signingKeys.key,
  cartData
);

// === PAYMENT SERVICE: Verifies carts (public keys only) ===
const paymentService = new CloudlessCrypto();

// Payment service receives public keys from cart service
await paymentService.signer.setPublicKey(
  'cart-service-public-key',
  signingKeys.publicKey
);

// Payment service can verify the token came from cart service
try {
  // First verify signature (public key verification)
  const signatureValid = await paymentService.signer.verify(
    secureToken,
    'cart-service-public-key'
  );
  console.log('✅ Signature verified - cart is from trusted cart service');
  
  // Payment service would need the encryption private key to decrypt
  // (This would be shared securely between cart and payment services)
  
} catch (error) {
  console.log('❌ Signature verification failed - untrusted source');
}
```

### Key Distribution Patterns

#### Pattern 1: Public Key Registry
```typescript
// Public key server/registry that all services can access
class PublicKeyRegistry {
  private keys = new Map<string, any>();
  
  async registerPublicKey(serviceId: string, publicKey: any) {
    this.keys.set(serviceId, publicKey);
    console.log(`✅ Public key registered for ${serviceId}`);
  }
  
  async getPublicKey(serviceId: string) {
    const key = this.keys.get(serviceId);
    if (!key) throw new Error(`No public key found for ${serviceId}`);
    return key;
  }
}

// Usage across services
const keyRegistry = new PublicKeyRegistry();

// Cart service registers its public key
const cartService = new CloudlessCrypto();
const cartKeys = await cartService.generateSigningKeyPair();
await keyRegistry.registerPublicKey('cart-service', cartKeys.publicKey);

// Other services can fetch and use the public key
const orderService = new CloudlessCrypto();
const cartPublicKey = await keyRegistry.getPublicKey('cart-service');
await orderService.signer.setPublicKey('cart-service', cartPublicKey);

// Now order service can verify carts from cart service
const verifiedCart = await orderService.verifyObject(signedCart, 'cart-service');
```

#### Pattern 2: JWT with Public Key URLs
```typescript
// Include public key URL in JWT header for key discovery
const cartData = { userId: 'user123', total: 50.00 };

// Custom header with public key location
const signedWithKeyUrl = await cartService.signer.sign(cartKeys.key, cartData);
signedWithKeyUrl.header = {
  ...signedWithKeyUrl.header,
  jku: 'https://cart-service.com/.well-known/jwks.json', // Public key URL
  kid: cartKeys.key // Key ID
};

// Verification service can fetch public key from URL
const publicKeyUrl = signedWithKeyUrl.header.jku;
const keyId = signedWithKeyUrl.header.kid;

// Fetch public key from the URL (in real implementation)
const publicKey = await fetchPublicKeyFromUrl(publicKeyUrl, keyId);
await verificationService.signer.setPublicKey(keyId, publicKey);

const verified = await verificationService.verifyObject(signedWithKeyUrl, keyId);
```

### Multi-Service Architecture Example

```typescript
// === MICROSERVICES WITH PUBLIC KEY VERIFICATION ===

// Service 1: User Service (creates user tokens)
const userService = new CloudlessCrypto();
const userSigningKeys = await userService.generateSigningKeyPair();

const userToken = await userService.signObject(userSigningKeys.key, {
  userId: 'user123',
  permissions: ['read-cart', 'modify-cart'],
  expires: Date.now() + (60 * 60 * 1000) // 1 hour
});

// Service 2: Cart Service (verifies user tokens, creates cart tokens)
const cartService = new CloudlessCrypto();
const cartSigningKeys = await cartService.generateSigningKeyPair();

// Cart service has user service's public key
await cartService.signer.setPublicKey('user-service', userSigningKeys.publicKey);

// Verify user token (no private key needed)
const verifiedUser = await cartService.verifyObject(userToken, 'user-service');
console.log('✅ User verified:', verifiedUser.userId);

// Create cart token
const cartToken = await cartService.signObject(cartSigningKeys.key, {
  userId: verifiedUser.userId,
  cartId: 'cart-456',
  items: [{ name: 'widget', price: 25.00 }]
});

// Service 3: Payment Service (verifies cart tokens)
const paymentService = new CloudlessCrypto();

// Payment service has cart service's public key  
await paymentService.signer.setPublicKey('cart-service', cartSigningKeys.publicKey);

// Verify cart token
const verifiedCart = await paymentService.verifyObject(cartToken, 'cart-service');
console.log('✅ Cart verified for payment:', verifiedCart);

// Each service only needs:
// - Its own private key (for signing)
// - Other services' public keys (for verification)
// - Never shares private keys with other services
```

### Encryption Public Key Distribution

While signing verification only needs the public key, **encryption requires distributing the public encryption key** so other services can encrypt data for a specific service.

```typescript
// === PAYMENT SERVICE: Needs to encrypt data for Cart Service ===
const paymentService = new CloudlessCrypto();

// Payment service gets Cart Service's PUBLIC encryption key
const cartServiceEncryptionPublicKey = await getPublicKeyFromRegistry('cart-service-encryption');

// Payment service imports the public key for encryption
await paymentService.encryptor.importKeyPairForEncryption(
  'cart-service-encryption',
  cartServiceEncryptionPublicKey,
  null, // No private key - can't decrypt!
  'RSA-OAEP-256'
);

// Now payment service can encrypt data FOR cart service
const sensitivePaymentData = {
  transactionId: 'txn-12345',
  creditCardToken: 'tok_1234567890',
  billingAddress: '123 Main St, City, State',
  amount: 99.99
};

// Encrypt data so ONLY cart service can decrypt it
const encryptedForCartService = await paymentService.encryptToken(
  'cart-service-encryption',
  sensitivePaymentData,
  { audience: 'cart-service', expirationTime: '1h' }
);

console.log('Encrypted payment data for cart service:', encryptedForCartService);

// === CART SERVICE: Can decrypt data encrypted for it ===
const cartService = new CloudlessCrypto();
// Cart service has both public AND private encryption keys

// Cart service can decrypt data encrypted for it
const decryptedPaymentData = await cartService.decryptToken(
  cartService.encryptionKeyId, // Has private key
  encryptedForCartService
);

console.log('Decrypted payment data:', decryptedPaymentData);
```

### Complete Multi-Service Example with Both Key Types

```typescript
// === COMPREHENSIVE MICROSERVICES SETUP ===

// Service A: User Service
const userService = new CloudlessCrypto();
const userSigningKeys = await userService.generateSigningKeyPair();
const userEncryptionKeys = await userService.generateEncryptionKeyPair();

// Service B: Cart Service  
const cartService = new CloudlessCrypto();
const cartSigningKeys = await cartService.generateSigningKeyPair();
const cartEncryptionKeys = await cartService.generateEncryptionKeyPair();

// Service C: Payment Service
const paymentService = new CloudlessCrypto();
const paymentSigningKeys = await paymentService.generateSigningKeyPair();
const paymentEncryptionKeys = await paymentService.generateEncryptionKeyPair();

// === PUBLIC KEY DISTRIBUTION ===
const publicKeyRegistry = {
  // Signing public keys (for verification)
  'user-service-signing': userSigningKeys.publicKey,
  'cart-service-signing': cartSigningKeys.publicKey,
  'payment-service-signing': paymentSigningKeys.publicKey,
  
  // Encryption public keys (for encrypting data TO that service)
  'user-service-encryption': userEncryptionKeys.publicKey,
  'cart-service-encryption': cartEncryptionKeys.publicKey,
  'payment-service-encryption': paymentEncryptionKeys.publicKey
};

// === CART SERVICE SETUP ===
// Cart service can verify user tokens (needs user's signing public key)
await cartService.signer.setPublicKey(
  'user-service-signing', 
  publicKeyRegistry['user-service-signing']
);

// Cart service can encrypt data for payment service (needs payment's encryption public key)
await cartService.encryptor.importKeyPairForEncryption(
  'payment-service-encryption',
  publicKeyRegistry['payment-service-encryption'],
  null, // No private key
  'RSA-OAEP-256'
);

// === PAYMENT SERVICE SETUP ===
// Payment service can verify cart tokens (needs cart's signing public key)
await paymentService.signer.setPublicKey(
  'cart-service-signing',
  publicKeyRegistry['cart-service-signing']
);

// Payment service can encrypt data for cart service (needs cart's encryption public key)
await paymentService.encryptor.importKeyPairForEncryption(
  'cart-service-encryption',
  publicKeyRegistry['cart-service-encryption'], 
  null, // No private key
  'RSA-OAEP-256'
);

// === REAL-WORLD FLOW ===

// 1. User creates token
const userToken = await userService.signObject(userSigningKeys.key, {
  userId: 'user123',
  permissions: ['create-cart'],
  expires: Date.now() + 3600000
});

// 2. Cart service verifies user token
const verifiedUser = await cartService.verifyObject(userToken, 'user-service-signing');
console.log('✅ User verified:', verifiedUser.userId);

// 3. Cart service creates cart and encrypts it for payment service
const cartData = {
  cartId: 'cart-456',
  userId: verifiedUser.userId,
  items: [{ name: 'Premium Item', price: 199.99 }],
  total: 199.99
};

const encryptedCartForPayment = await cartService.encryptToken(
  'payment-service-encryption', // Payment service can decrypt this
  cartData,
  { audience: 'payment-service' }
);

// 4. Payment service receives encrypted cart and can decrypt it
const decryptedCart = await paymentService.decryptToken(
  paymentEncryptionKeys.key, // Payment service's private key
  encryptedCartForPayment
);

console.log('✅ Payment service decrypted cart:', decryptedCart);

// 5. Payment service encrypts receipt for cart service
const paymentReceipt = {
  transactionId: 'txn-789',
  cartId: decryptedCart.cartId,
  status: 'completed',
  amount: decryptedCart.total
};

const encryptedReceiptForCart = await paymentService.encryptToken(
  'cart-service-encryption', // Cart service can decrypt this
  paymentReceipt,
  { audience: 'cart-service' }
);

// 6. Cart service decrypts receipt
const decryptedReceipt = await cartService.decryptToken(
  cartEncryptionKeys.key, // Cart service's private key
  encryptedReceiptForCart
);

console.log('✅ Cart service received receipt:', decryptedReceipt);
```

### Public Key Registry Pattern for Encryption Keys

```typescript
class CryptoKeyRegistry {
  private signingKeys = new Map<string, any>();
  private encryptionKeys = new Map<string, any>();
  
  // Register keys when services start up
  async registerServiceKeys(serviceId: string, keys: {
    signingPublic: any,
    encryptionPublic: any
  }) {
    this.signingKeys.set(`${serviceId}-signing`, keys.signingPublic);
    this.encryptionKeys.set(`${serviceId}-encryption`, keys.encryptionPublic);
    console.log(`✅ Registered keys for ${serviceId}`);
  }
  
  // Get signing public key (for verifying tokens from that service)
  async getSigningPublicKey(serviceId: string) {
    return this.signingKeys.get(`${serviceId}-signing`);
  }
  
  // Get encryption public key (for encrypting data TO that service)
  async getEncryptionPublicKey(serviceId: string) {
    return this.encryptionKeys.get(`${serviceId}-encryption`);
  }
}

// Usage in service initialization
const keyRegistry = new CryptoKeyRegistry();

// Each service registers its public keys
await keyRegistry.registerServiceKeys('user-service', {
  signingPublic: userSigningKeys.publicKey,
  encryptionPublic: userEncryptionKeys.publicKey
});

await keyRegistry.registerServiceKeys('cart-service', {
  signingPublic: cartSigningKeys.publicKey, 
  encryptionPublic: cartEncryptionKeys.publicKey
});

// Services fetch keys they need
const cartSigningPubKey = await keyRegistry.getSigningPublicKey('cart-service');
const cartEncryptionPubKey = await keyRegistry.getEncryptionPublicKey('cart-service');

// Payment service can now:
// 1. Verify tokens signed BY cart service (using cart's signing public key)
// 2. Encrypt data FOR cart service (using cart's encryption public key)
```

### Security Benefits of Public Key Verification

1. **🔒 Private Key Isolation**
   - Private keys never leave the owning service
   - Compromise of one service doesn't expose other services' signing/decryption capability
   - Each service only has the minimum keys needed

2. **📈 Scalable Architecture**
   - Multiple services can verify/encrypt without coordination
   - No need to share sensitive key material
   - Easy to add new services to the ecosystem

3. **🛡️ Defense in Depth**
   - Even if a service is compromised, attacker cannot forge signatures for other services
   - Cannot decrypt data intended for other services
   - Public key distribution can be monitored and audited

4. **⚡ Performance Benefits**
   - Services don't need secure storage for other services' private keys
   - Public keys can be cached and distributed via CDN
   - No secure communication needed for public key sharing

### Key Distribution Security Considerations

```typescript
// Security checklist for public key distribution
const securityConsiderations = {
  integrity: "✅ Public keys should be signed by trusted CA or verified via secure channel",
  authenticity: "✅ Verify public key fingerprints out-of-band",
  freshness: "✅ Monitor for key rotation and update public keys promptly",
  revocation: "✅ Have mechanism to revoke compromised public keys",
  storage: "✅ Public keys don't need secure storage but should be backed up"
};
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