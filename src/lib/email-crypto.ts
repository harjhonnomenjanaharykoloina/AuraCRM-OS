import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const HEX_64_REGEX = /^[0-9a-f]{64}$/i

export function getEncryptionKey(): Buffer {
    const raw = process.env.EMAIL_ENCRYPTION_KEY
    if (!raw || !HEX_64_REGEX.test(raw)) {
        const isProduction = process.env.NODE_ENV === "production"
        const message =
            "EMAIL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
            "Generate with: openssl rand -hex 32"
        if (isProduction) {
            throw new Error(`[email-crypto] ${message}`)
        }
        console.warn(`[email-crypto] ${message}`)
        throw new Error(`[email-crypto] Cannot encrypt/decrypt without a valid EMAIL_ENCRYPTION_KEY. ${message}`)
    }
    return Buffer.from(raw, "hex")
}

export async function encryptEmailCredential(plaintext: string): Promise<string> {
    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv("aes-256-gcm", key, iv)
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
    const authTag = cipher.getAuthTag()
    const combined = Buffer.concat([iv, authTag, ciphertext])
    return combined.toString("base64")
}

export async function decryptEmailCredential(encrypted: string): Promise<string> {
    const key = getEncryptionKey()
    const combined = Buffer.from(encrypted, "base64")
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error("[email-crypto] Encrypted payload is too short — malformed or corrupted")
    }
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return plaintext.toString("utf8")
}
