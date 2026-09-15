import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import { AppError } from '../../../packages/contracts/src/index.js';

export function createVerifier(supabaseUrl: string, issuer: string) {
  const jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`), {
    cacheMaxAge: 600000, cooldownDuration: 30000, timeoutDuration: 5000,
  });
  return async (token: string): Promise<string> => {
    const { payload } = await jwtVerify(token, jwks, {
      issuer, audience: 'authenticated', algorithms: ['ES256', 'RS256'],
      requiredClaims: ['sub', 'exp', 'iat'], clockTolerance: 5,
    });
    if (payload.role !== 'authenticated') throw new AppError(401, 'INVALID_TOKEN', 'Sessão inválida.');
    return z.uuid().parse(payload.sub);
  };
}
