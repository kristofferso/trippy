import { hash, verify } from '@node-rs/argon2';

const DEFAULT_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
  hashLength: 32,
  saltLength: 16,
};

export async function hashPassword(plain: string) {
  return hash(plain, DEFAULT_OPTIONS);
}

export async function verifyPassword(hashed: string, plain: string) {
  return verify(hashed, plain, DEFAULT_OPTIONS);
}
