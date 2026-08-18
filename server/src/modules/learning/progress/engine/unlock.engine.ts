import { BusinessRuleException } from '../../../../core/exceptions/app.exception';

export type UnlockType = 'SEQUENTIAL' | 'DATE_BASED' | 'MANUAL';

export interface UnlockRule {
  type: UnlockType;
  prerequisiteId?: string; // ChapterId or LessonId
  unlockDate?: string;     // ISO Date
}

/**
 * Gating Strategy: Determines if a student is allowed to access the next module.
 */
export class UnlockEngine {
  static canUnlock(rule: UnlockRule, progressContext: Map<string, any>): boolean {
    switch (rule.type) {
      case 'SEQUENTIAL':
        if (!rule.prerequisiteId) throw new BusinessRuleException('SEQUENTIAL rule missing prerequisiteId');
        return progressContext.get(rule.prerequisiteId)?.status === 'COMPLETED';
        
      case 'DATE_BASED':
        if (!rule.unlockDate) throw new BusinessRuleException('DATE_BASED rule missing unlockDate');
        return new Date() >= new Date(rule.unlockDate);
        
      case 'MANUAL':
        // Teacher toggles this manually, stored in context
        return progressContext.get('manual_unlock') === true;
        
      default:
        return false;
    }
  }
}
