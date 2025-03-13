// Note: Normally, I would handle this with a database such as MongoDB or PostgreSQL.
// However, since this is only a demo, this data will be handled with global variables. Yes, I feel your pain.

// Requested codes - before obtaining a token.
export const requested = new Map<string, { client_id: string, redirect_uri: string }>();
// Active codes - after obtaining a token.
// Attempting to activate a code more than once will result in that code and the token generated from it being revoked,
// per section 4.1.2 (https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2).
export const active = new Map<string, string>();
// Refresh tokens - per section 6 (https://datatracker.ietf.org/doc/html/rfc6749#section-6),
// there is no recommendation for the expiration period for refresh tokens, so I've enabled them to be used indefinitely for simplicity.
export const refresh = new Set<string>();
