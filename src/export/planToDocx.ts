import { saveAs } from 'file-saver'
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { SECTION_LABELS, TECHNIQUE_SECTION_ORDER, type SessionPlan, type Technique, type TechniqueInstance } from '../data/models'
import { billOfMaterials, effectiveMaterialItems, effectiveMaterialsNote, formatLine } from '../lib/materials'
import { effectiveDescription, effectiveName, resolveTechnique } from '../lib/planMath'

const TABLE_HEADERS = ['Step', 'Time', 'Description', 'Materials', 'Facilitator notes']
const BOM_HEADERS = ['Item', 'Qty', 'Used in']

function headerRow(headers: string[] = TABLE_HEADERS): TableRow {
  return new TableRow({
    children: headers.map(
      (text) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
        }),
    ),
  })
}

function textCell(text: string): TableCell {
  return new TableCell({ children: [new Paragraph(text)] })
}

function instanceRow(instance: TechniqueInstance, technique: Technique | undefined, participantCount: number): TableRow {
  const materialLines = [
    ...effectiveMaterialItems(instance, technique).map((line) => formatLine(line, participantCount)),
    effectiveMaterialsNote(instance, technique),
  ].filter(Boolean)
  return new TableRow({
    children: [
      textCell(effectiveName(instance, technique)),
      textCell(`${instance.actualMinutes} min`),
      textCell(effectiveDescription(instance, technique)),
      new TableCell({
        children: materialLines.length ? materialLines.map((line) => new Paragraph(line)) : [new Paragraph('')],
      }),
      textCell(instance.facilitatorNotes),
    ],
  })
}

export async function exportPlanToDocx(
  plan: SessionPlan,
  allInstances: TechniqueInstance[],
  allTechniques: Technique[],
): Promise<void> {
  const instanceById = new Map(allInstances.map((i) => [i.id, i]))
  const techniqueById = new Map(allTechniques.map((t) => [t.id, t]))

  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: plan.name, heading: HeadingLevel.TITLE }),
    new Paragraph(`RG of ${plan.participantCount} participants`),

    new Paragraph({ text: 'Problem Owner', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      children: [new TextRun({ text: plan.problemOwnerName || 'Not named', bold: true })],
    }),
    new Paragraph(plan.problemOwnerDescription || '—'),

    new Paragraph({ text: 'Problem as Given', heading: HeadingLevel.HEADING_1 }),
    new Paragraph(plan.problemAsGiven || '—'),

    new Paragraph({ text: 'Case background', heading: HeadingLevel.HEADING_1 }),
    new Paragraph(plan.introduction || '—'),
  ]

  for (const sectionId of TECHNIQUE_SECTION_ORDER) {
    const instanceIds = plan.sections[sectionId]
    children.push(new Paragraph({ text: SECTION_LABELS[sectionId], heading: HeadingLevel.HEADING_1 }))

    if (instanceIds.length === 0) {
      children.push(new Paragraph('No techniques in this section.'))
      continue
    }

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          headerRow(),
          ...instanceIds.map((id) => {
            const instance = instanceById.get(id)
            if (!instance) {
              return new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph(`Missing instance (${id})`)],
                    columnSpan: TABLE_HEADERS.length,
                  }),
                ],
              })
            }
            return instanceRow(instance, resolveTechnique(instance, techniqueById), plan.participantCount)
          }),
        ],
      }),
    )
  }

  const bom = billOfMaterials(plan, instanceById, techniqueById, effectiveName)
  if (bom.length > 0) {
    children.push(
      new Paragraph({ text: 'Bill of materials', heading: HeadingLevel.HEADING_1 }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          headerRow(BOM_HEADERS),
          ...bom.map(
            (row) =>
              new TableRow({
                children: [
                  textCell(row.reusable ? `${row.name} (reusable)` : row.name),
                  textCell(String(row.quantity)),
                  textCell(row.usedIn.join(', ')),
                ],
              }),
          ),
        ],
      }),
    )
  }

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  const filename = `${plan.name.replace(/[^a-z0-9 -]/gi, '').trim() || 'session-plan'}.docx`
  saveAs(blob, filename)
}
