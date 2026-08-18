import { PrismaClient, Prisma } from '@prisma/client';
import { GradeFormulaDTO, GradeFormulaComponentDTO } from '../dtos/gradebook.dto';

export interface IFormulaRepository {
  findForCourse(courseId: string, tenantId: string): Promise<any | null>;
  upsert(courseId: string, tenantId: string, actorId: string, dto: GradeFormulaDTO): Promise<any>;
}

export class PrismaFormulaRepository implements IFormulaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findForCourse(courseId: string, tenantId: string): Promise<any | null> {
    return this.prisma.gradeFormula.findFirst({
      where: { courseId, tenantId },
      include: { components: { orderBy: { weightPercentage: 'desc' } } },
    });
  }

  async upsert(courseId: string, tenantId: string, actorId: string, dto: GradeFormulaDTO): Promise<any> {
    const existing = await this.prisma.gradeFormula.findUnique({
      where: { courseId },
      select: { id: true },
    });

    const formula = await this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.gradeFormula.update({
          where: { id: existing.id },
          data: {
            calculationType: dto.calculationType,
            passingScore: dto.passingScore,
            updatedById: actorId,
            version: { increment: 1 },
          },
        });
        await tx.gradeFormulaComponent.deleteMany({ where: { formulaId: existing.id } });
      } else {
        await tx.gradeFormula.create({
          data: {
            courseId,
            tenantId,
            calculationType: dto.calculationType,
            passingScore: dto.passingScore,
            createdById: actorId,
          },
        });
      }

      const formulaRow = await tx.gradeFormula.findUnique({ where: { courseId } });
      if (!formulaRow) throw new Error('Formula create failed');

      const components: Prisma.GradeFormulaComponentCreateManyInput[] = dto.components.map(
        (c: GradeFormulaComponentDTO) => ({
          tenantId,
          formulaId: formulaRow.id,
          sourceType: c.sourceType,
          weightPercentage: c.weightPercentage,
          dropLowest: c.dropLowest,
        }),
      );
      if (components.length > 0) {
        await tx.gradeFormulaComponent.createMany({ data: components });
      }

      return tx.gradeFormula.findUnique({
        where: { id: formulaRow.id },
        include: { components: { orderBy: { weightPercentage: 'desc' } } },
      });
    });

    return formula;
  }
}
