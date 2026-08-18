import { randomBytes, createHash } from 'crypto';

/**
 * Handles generation and cryptographic hashing of opaque tokens.
 */
export const TokenUtil = {
  /**
   * Generates a strong random opaque token (CSPRNG)
   */
  generateOpaqueToken(): string {
    return randomBytes(40).toString('hex');
  },

  /**
   * Hashes a token using SHA-256 for secure database storage.
   * Ensures that if the DB is compromised, the tokens cannot be used.
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  },

  generateNumericOTP(length: number = 6): string {
    // Generate secure random numbers
    let otp = '';
    while (otp.length < length) {
      const byte = randomBytes(1)[0];
      if (byte < 250) {
        otp += (byte % 10).toString();
      }
    }
    return otp;
  },

  generateVerificationToken(): string {
    return this.generateOpaqueToken();
  },

  generateResetToken(): string {
    return this.generateOpaqueToken();
  }
};
