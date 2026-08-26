import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { sessionSecret } from "@/lib/config";
export type SpotifySession = { accessToken: string; refreshToken: string; expiresAt: number; scope: string };
type Value = SpotifySession | { state: string; verifier: string };
const key = () => createHash("sha256").update(sessionSecret()).digest();
export const randomValue = () => randomBytes(32).toString("base64url");
export function seal(value: Value) { const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv); const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url"); }
export function unseal<T>(value: string): T | null { try { const raw = Buffer.from(value, "base64url"); const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12)); decipher.setAuthTag(raw.subarray(12, 28)); return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString()) as T; } catch { return null; } }
