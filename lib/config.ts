const required = ["SPOTIFY_CLIENT_ID", "SPOTIFY_REDIRECT_URI", "SESSION_SECRET"] as const;
export function spotifyConfig() { const missing = required.filter((key) => !process.env[key]); if (missing.length) throw new Error(`Missing: ${missing.join(", ")}`); return { clientId: process.env.SPOTIFY_CLIENT_ID!, redirectUri: process.env.SPOTIFY_REDIRECT_URI! }; }
export function sessionSecret() { const secret = process.env.SESSION_SECRET; if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters."); return secret; }
