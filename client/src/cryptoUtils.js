const ENC_ALGO = "AES-GCM";
const ECC_ALGO = "ECDH";
const CURVE = "P-256";

// Helper: Convert Base64 string to Uint8Array buffer
const base64ToBuf = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

// Helper: Convert ArrayBuffer to Base64 string
const bufToBase64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));

/**
 * Generates a permanent ECC identity key pair for a user.
 * The Public Key is sent to the server; the Private Key stays in the browser.
 */
export async function generateIdentityKeys() {
  const keys = await window.crypto.subtle.generateKey(
    { name: ECC_ALGO, namedCurve: CURVE },
    true, 
    ["deriveKey", "deriveBits"]
  );
  const publicKey = await window.crypto.subtle.exportKey("spki", keys.publicKey);
  const privateKey = await window.crypto.subtle.exportKey("pkcs8", keys.privateKey);

  return { 
    publicKey: bufToBase64(publicKey), 
    privateKey: bufToBase64(privateKey) 
  };
}

/**
 * Encrypts a file for a specific recipient.
 * Implements the ECDH handshake to derive a unique AES-GCM key.
 */
export async function encryptFileECC(file, recipientPubKeyB64) {
  // 1. Generate an Ephemeral (one-time) key pair for this file session
  const ephemeralKeys = await window.crypto.subtle.generateKey(
    { name: ECC_ALGO, namedCurve: CURVE }, 
    true, 
    ["deriveKey"]
  );
  
  // 2. Import the Recipient's Public Key
  const recipientPubKey = await window.crypto.subtle.importKey(
    "spki", 
    base64ToBuf(recipientPubKeyB64),
    { name: ECC_ALGO, namedCurve: CURVE }, 
    false, 
    []
  );

  // 3. Derive the Shared Secret (The "Crypto-shredding" path)
  const aesKey = await window.crypto.subtle.deriveKey(
    { name: ECC_ALGO, public: recipientPubKey },
    ephemeralKeys.privateKey,
    { name: ENC_ALGO, length: 256 }, 
    false, 
    ["encrypt"]
  );

  // 4. Encrypt the data using AES-GCM (Authenticated Encryption)
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const fileBuffer = await file.arrayBuffer();
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: ENC_ALGO, iv }, 
    aesKey, 
    fileBuffer
  );

  const exportedEphemeralPub = await window.crypto.subtle.exportKey("spki", ephemeralKeys.publicKey);

  return {
    ciphertext,
    iv: bufToBase64(iv),
    senderEphemeralPublicKey: bufToBase64(exportedEphemeralPub)
  };
}

/**
 * Decrypts the file using the recipient's private key and sender's ephemeral public key.
 */
export async function decryptFileECC(encryptedBuf, senderPubB64, myPrivKeyB64, ivB64) {
  const senderPub = await window.crypto.subtle.importKey(
    "spki", 
    base64ToBuf(senderPubB64),
    { name: ECC_ALGO, namedCurve: CURVE }, 
    false, 
    []
  );

  const myPriv = await window.crypto.subtle.importKey(
    "pkcs8", 
    base64ToBuf(myPrivKeyB64),
    { name: ECC_ALGO, namedCurve: CURVE }, 
    false, 
    ["deriveKey"]
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    { name: ECC_ALGO, public: senderPub },
    myPriv, 
    { name: ENC_ALGO, length: 256 }, 
    false, 
    ["decrypt"]
  );

  return await window.crypto.subtle.decrypt(
    { name: ENC_ALGO, iv: base64ToBuf(ivB64) },
    aesKey, 
    encryptedBuf
  );
}