import { IResourceStrategy } from './resource.interface';
import { BusinessRuleException } from '../../../../core/exceptions/app.exception';

/**
 * Registry mapping Material Type to its processing Strategy.
 * Enforces the Open/Closed Principle.
 */
export class ResourceStrategyRegistry {
  private static strategies = new Map<string, IResourceStrategy>();

  static register(strategy: IResourceStrategy): void {
    this.strategies.set(strategy.type.toUpperCase(), strategy);
  }

  static getStrategy(type: string): IResourceStrategy {
    const strategy = this.strategies.get(type.toUpperCase());
    if (!strategy) {
      throw new BusinessRuleException(`Unsupported material resource type: ${type}`);
    }
    return strategy;
  }
}
