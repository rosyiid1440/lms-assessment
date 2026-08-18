/**
 * Report Card Builder Pattern
 * Decouples the assembly of a report card from its final representation (JSON, HTML, PDF).
 */

export interface ReportCardPayload {
  studentInfo?: any;
  academicGrades?: any[];
  competencyDescriptions?: any[];
  attendance?: any;
  p5Projects?: any[];
  teacherNote?: string;
  signatures?: any[];
}

export class ReportCardBuilder {
  private payload: ReportCardPayload = {};

  setStudentInfo(info: any): this {
    this.payload.studentInfo = info;
    return this;
  }

  addAcademicGrade(subjectName: string, finalScore: number, gradeLetter: string): this {
    if (!this.payload.academicGrades) this.payload.academicGrades = [];
    this.payload.academicGrades.push({ subjectName, finalScore, gradeLetter });
    return this;
  }

  addCompetencyDescription(subjectName: string, highestTp: string, lowestTp: string): this {
    if (!this.payload.competencyDescriptions) this.payload.competencyDescriptions = [];
    this.payload.competencyDescriptions.push({ subjectName, highestTp, lowestTp });
    return this;
  }

  setAttendance(sick: number, permission: number, absent: number): this {
    this.payload.attendance = { sick, permission, absent };
    return this;
  }

  setTeacherNote(note: string): this {
    this.payload.teacherNote = note;
    return this;
  }

  addSignature(role: string, name: string, digitalSignatureStr: string): this {
    if (!this.payload.signatures) this.payload.signatures = [];
    this.payload.signatures.push({ role, name, digitalSignatureStr });
    return this;
  }

  /**
   * Returns the assembled raw JSON payload.
   * Can be passed to a PDF Generator service later.
   */
  build(): ReportCardPayload {
    // Validation Engine Check could go here (e.g., throw if no signatures)
    return this.payload;
  }
}
