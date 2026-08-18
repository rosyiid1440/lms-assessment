import { LearningAnalyticsEvent } from '../events/learning-analytics.events';
import { IProgressStrategy } from '../strategy/progress.strategy';
import { CompletionRuleEngine, CompletionRuleNode } from '../engine/completion-rule.engine';
import { UnlockEngine, UnlockRule } from '../engine/unlock.engine';
import { IEventPublisher } from '../../../authorization/service';

// Mock interfaces for dependencies
export interface IEventStore {
  append(event: LearningAnalyticsEvent): Promise<void>;
  getEventsForMaterial(enrollmentId: string, materialId: string): Promise<any[]>;
}

export interface IProgressProjectionRepository {
  updateMaterialProgress(enrollmentId: string, materialId: string, progress: number, isCompleted: boolean): Promise<void>;
  updateLessonProgress(enrollmentId: string, lessonId: string, isCompleted: boolean): Promise<void>;
  getStudentContext(enrollmentId: string): Promise<Map<string, any>>;
}

/**
 * Service that acts as an Event Handler. 
 * Orchestrates the Event Store, Strategy calculation, and Projection updates.
 */
export class ProgressService {
  constructor(
    private readonly eventStore: IEventStore,
    private readonly projectionRepo: IProgressProjectionRepository,
    private readonly strategyRegistry: Map<string, IProgressStrategy>, // PDF, VIDEO, etc.
    private readonly eventPublisher: IEventPublisher
  ) {}

  /**
   * Main Entry Point for streaming analytics events from clients.
   */
  async processEvent(event: LearningAnalyticsEvent, materialMetadata: any, completionRule: CompletionRuleNode): Promise<void> {
    
    // 1. Append to Event Log (Source of Truth for Data Warehouse)
    // Needs OCC check via event.aggregateVersion in reality
    await this.eventStore.append(event);

    // If it's a material-specific event, recalculate progress
    if (event.materialId) {
      const strategy = this.strategyRegistry.get(materialMetadata.type);
      if (strategy) {
        // Fetch all historical events for this material to recalculate
        // Optimization: Snapshots can be used here instead of full replay
        const history = await this.eventStore.getEventsForMaterial(event.aggregateId, event.materialId);
        
        const progress = strategy.calculateProgress(history, materialMetadata);
        const isCompleted = strategy.isCompleted(history, materialMetadata);

        // 2. Update Fast O(1) Projection
        await this.projectionRepo.updateMaterialProgress(event.aggregateId, event.materialId, progress, isCompleted);
      }
    }

    // 3. Evaluate Completion Engine (Propagate up to Lesson/Chapter/Course)
    const context = await this.projectionRepo.getStudentContext(event.aggregateId);
    
    const isLessonCompleted = CompletionRuleEngine.evaluate(completionRule, context);
    if (isLessonCompleted && context.get(event.lessonId!)?.status !== 'COMPLETED') {
      
      // Update projection for Lesson
      await this.projectionRepo.updateLessonProgress(event.aggregateId, event.lessonId!, true);
      
      // Emit internal event for further pipeline propagation (e.g., Unlock Engine evaluation)
      this.eventPublisher.publish({
        eventId: require('crypto').randomUUID(),
        eventName: 'learning.lesson_completed',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        tenantId: 'resolved-tenant-id', // Extracted from context
        correlationId: 'resolved-correlation-id',
        requestId: 'resolved-request-id',
        metadata: {
          enrollmentId: event.aggregateId,
          lessonId: event.lessonId
        }
      });
    }
  }

  /**
   * Queries the Unlock Engine to see if a student can access a chapter
   */
  async canAccessChapter(enrollmentId: string, rule: UnlockRule): Promise<boolean> {
    // 4. O(1) Fetch from projection
    const context = await this.projectionRepo.getStudentContext(enrollmentId);
    return UnlockEngine.canUnlock(rule, context);
  }
}
