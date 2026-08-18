import { IPolicy } from './policy';

/**
 * Auto-resolves Policies based on the Resource Name.
 * Prevents middleware from instantiating policies manually.
 */
export class PolicyRegistry {
  private static policies = new Map<string, IPolicy>();

  /**
   * Register a policy against a specific resource (e.g., 'Assignment')
   */
  static register(resourceName: string, policy: IPolicy): void {
    this.policies.set(resourceName.toLowerCase(), policy);
  }

  /**
   * Retrieve the mapped policy. 
   * Returns null if no policy is registered (Open-Closed Principle).
   */
  static getPolicy(resourceName: string): IPolicy | null {
    return this.policies.get(resourceName.toLowerCase()) || null;
  }
}
