// client/src/aesUtils.js
import CryptoJS from 'crypto-js';

// Helper to convert ArrayBuffer to WordArray
function arrayBufferToWordArray(ab) {
  const i8a = new Uint8Array(ab);
  const a = [];
  for (let i = 0; i < i8a.length; i += 4) {
    a.push((i8a[i] << 24) | (i8a[i + 1] << 16) | (i8a[i + 2] << 8) | i8a[i + 3]);
  }
  return CryptoJS.lib.WordArray.create(a, i8a.length);
}

// Helper to convert WordArray to Blob
function wordArrayToBlob(wordArray, type) {
    const len = wordArray.sigBytes;
    const u8 = new Uint8Array(len);
    let i = 0;
    while(i < len) {
        const word = wordArray.words[i/4];
        u8[i]   = (word >> 24) & 0xff;
        u8[i+1] = (word >> 16) & 0xff;
        u8[i+2] = (word >> 8)  & 0xff;
        u8[i+3] =  word        & 0xff;
        i+=4;
    }
    return new Blob([u8], { type: type || 'application/octet-stream' });
}

// Encrypt file data using AES with PBKDF2
export const encryptFileData = (file, password) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const arrayBuffer = event.target.result;
      const wordArray = arrayBufferToWordArray(arrayBuffer);
      
      // Generate a random salt
      const salt = CryptoJS.lib.WordArray.random(128 / 8);
      
      // Derive a key from the password and salt
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 1000
      });

      // Encrypt the data
      const encrypted = CryptoJS.AES.encrypt(wordArray, key, { 
        iv: CryptoJS.lib.WordArray.random(128 / 8) // Use a random IV
      });

      // Combine salt, iv, and ciphertext to be stored
      const encryptedData = salt.toString() + encrypted.iv.toString() + encrypted.ciphertext.toString();
      resolve(encryptedData);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// Decrypt file data using AES with PBKDF2
export const decryptFileData = (encryptedFileBlob, password, fileType) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const combinedData = event.target.result;

      try {
        // Extract salt, iv, and ciphertext
        const salt = CryptoJS.enc.Hex.parse(combinedData.substr(0, 32));
        const iv = CryptoJS.enc.Hex.parse(combinedData.substr(32, 32));
        const ciphertext = CryptoJS.enc.Hex.parse(combinedData.substr(64));

        // Derive the key using the same parameters
        const key = CryptoJS.PBKDF2(password, salt, {
          keySize: 256 / 32,
          iterations: 1000
        });

        // Decrypt
        const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, key, { iv: iv });

        const decryptedBlob = wordArrayToBlob(decrypted, fileType);
        
        if (decryptedBlob.size === 0) {
            return reject(new Error("Decryption failed: Incorrect OTP or corrupted file."));
        }
        
        resolve(decryptedBlob);
      } catch (e) {
        console.error("Decryption exception:", e);
        reject(new Error("Decryption failed. Please check the OTP."));
      }
    };
    reader.onerror = reject;
    reader.readAsText(encryptedFileBlob);
  });
};