/**
 * hash.ts — password hashing utilities.
 *
 * EDUCATIONAL NOTE
 * ----------------
 * NEVER store plaintext passwords.  We use bcrypt, which:
 *   1. Generates a unique random "salt" for each password.
 *   2. Runs the blowfish cipher 12 rounds (configurable) to produce
 *      a hash that is computationally expensive to crack.
 *   3. Embeds the salt + rounds inside the hash string, so we only
 *      need one column to store and verify.
 *
 * The `compare` function uses a constant-time comparison to prevent
 * timing attacks.
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plain, salt);
}

export async function comparePassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
