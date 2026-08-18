import React from 'react';
import type { SubjectDef } from './registry';
import { mathTool } from './tools/MatematikaTool';
import { kimiaTool } from './tools/KimiaTool';
import { biologiTool } from './tools/BiologiTool';
import { ekonomiTool } from './tools/EkonomiTool';
import { geografiTool } from './tools/GeografiTool';
import { sejarahTool } from './tools/SejarahTool';
import { sosiologiTool } from './tools/SosiologiTool';
import { bahasaIndonesiaTool } from './tools/BahasaIndonesiaTool';
import { ppknTool } from './tools/PpknTool';
import { pjokTool } from './tools/PjokTool';

export type SubjectTool = React.ComponentType<{ subject: SubjectDef }>;

export const toolsBySubject: Record<string, SubjectTool> = {
  matematika: mathTool,
  fisika: mathTool,
  kimia: kimiaTool,
  biologi: biologiTool,
  ekonomi: ekonomiTool,
  geografi: geografiTool,
  sejarah: sejarahTool,
  sosiologi: sosiologiTool,
  'bahasa-indonesia': bahasaIndonesiaTool,
  'bahasa-inggris': mathTool,
  pai: mathTool,
  ppkn: ppknTool,
  pjok: pjokTool,
  informatika: mathTool,
  'seni-budaya': mathTool,
};

export const toolsAvailable = Object.keys(toolsBySubject);