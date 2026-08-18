import { GradeFormulaDTO } from '../dtos/gradebook.dto';
import { IFormulaRepository } from '../repositories/formula.repository';
import { ResourceNotFoundException, BusinessRuleException } from '../../../core/exceptions/app.exception';

export class FormulaService {
  constructor(private readonly repo: IFormulaRepository) {}

  async getForCourse(courseId: string, tenantId: string) {
    const formula = await this.repo.findForCourse(courseId, tenantId);
    if (!formula) {
      return {
        courseId,
        calculationType: 'WEIGHTED_AVERAGE',
        passingScore: 75,
        components: [
          { sourceType: 'ASSIGNMENT', weightPercentage: 50, dropLowest: false },
          { sourceType: 'EXAM', weightPercentage: 50, dropLowest: false },
        ],
      };
    }
    return formula;
  }

  async upsert(courseId: string, tenantId: string, actorId: string, dto: GradeFormulaDTO) {
    const totalWeight = dto.components.reduce((sum, c) => sum + c.weightPercentage, 0);
    if (Math.abs(totalWeight - 100) > 0.001) {
      throw new BusinessRuleException('Total bobot komponen harus 100%');
    }
    const seen = new Set<string>();
    for (const c of dto.components) {
      if (seen.has(c.sourceType)) throw new BusinessRuleException(`Duplikasi komponen sumber ${c.sourceType}`);
      seen.add(c.sourceType);
    }

    const formula = await this.repo.upsert(courseId, tenantId, actorId, dto);
    if (!formula) throw new ResourceNotFoundException('GradeFormula', courseId);
    return formula;
  }
}
