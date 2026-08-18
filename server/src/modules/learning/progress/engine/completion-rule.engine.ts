import { BusinessRuleException } from '../../../../core/exceptions/app.exception';

export type RuleType = 'AND' | 'OR' | 'LESSON_COMPLETED' | 'MATERIAL_COMPLETED' | 'MIN_SCORE';

export interface CompletionRuleNode {
  type: RuleType;
  targetId?: string; // lessonId or materialId
  value?: number;    // e.g., 75 for MIN_SCORE
  children?: CompletionRuleNode[];
}

/**
 * Evaluates completion based on a dynamic AST (Abstract Syntax Tree) rule set.
 * Allows teachers to define custom completion logic per Chapter/Course without code changes.
 */
export class CompletionRuleEngine {
  
  /**
   * Evaluates if the rule tree is satisfied given the student's current progress context.
   */
  static evaluate(rule: CompletionRuleNode, progressContext: Map<string, any>): boolean {
    switch (rule.type) {
      case 'AND':
        if (!rule.children || rule.children.length === 0) return true;
        return rule.children.every(child => this.evaluate(child, progressContext));
      
      case 'OR':
        if (!rule.children || rule.children.length === 0) return false;
        return rule.children.some(child => this.evaluate(child, progressContext));
      
      case 'LESSON_COMPLETED':
      case 'MATERIAL_COMPLETED':
        if (!rule.targetId) throw new BusinessRuleException('Rule missing targetId');
        // progressContext holds status flags for lessons/materials
        return progressContext.get(rule.targetId)?.status === 'COMPLETED';
      
      case 'MIN_SCORE':
        if (!rule.targetId || rule.value === undefined) throw new BusinessRuleException('Rule missing targetId or value');
        const score = progressContext.get(rule.targetId)?.score || 0;
        return score >= rule.value;
      
      default:
        throw new BusinessRuleException(`Unknown rule type: ${rule.type}`);
    }
  }
}
