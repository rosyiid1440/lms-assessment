import * as argon2 from 'argon2';
import { env } from '../../core/config/env';

export const HashUtil = {
  async hash(password: string): Promise<string> {
    const pepperedPassword = `${password}${env.PASSWORD_PEPPER}`;
    return argon2.hash(pepperedPassword, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });
  },

  async verify(hash: string, password: string): Promise<boolean> {
    const pepperedPassword = `${password}${env.PASSWORD_PEPPER}`;
    try {
      return await argon2.verify(hash, pepperedPassword);
    } catch (err) {
      // Internal logging could be added here (e.g., Winston logger)
      // We return false gracefully to prevent leaking information
      return false;
    }
  }
};
