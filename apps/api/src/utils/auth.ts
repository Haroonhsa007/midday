import { createRemoteJWKSet, jwtVerify } from "jose";
export type Session = {
  user: { id: string; email?: string; full_name?: string };
  teamId?: string;
  aal?: string;
};
const issuer = process.env.AUTH_JWT_ISSUER ?? "http://localhost:3001";
const JWKS = createRemoteJWKSet(
  new URL(process.env.AUTH_JWKS_URL ?? `${issuer}/api/auth/jwks`),
);
export async function verifyAccessToken(
  accessToken?: string,
): Promise<Session | null> {
  if (!accessToken) return null;
  try {
    const { payload } = await jwtVerify(accessToken, JWKS, {
      issuer,
      audience: process.env.AUTH_JWT_AUDIENCE ?? "midday-api",
      algorithms: ["EdDSA"],
    });
    if (!payload.sub) return null;
    return {
      user: {
        id: payload.sub,
        email: typeof payload.email === "string" ? payload.email : undefined,
        full_name: typeof payload.name === "string" ? payload.name : undefined,
      },
      aal: typeof payload.aal === "string" ? payload.aal : "aal1",
    };
  } catch {
    return null;
  }
}
