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
import { effectiveDescription, effectiveMaterials, effectiveName, resolveTechnique } from '../lib/planMath'

const TABLE_HEADERS = ['Time', 'What', 'Aim', 'Materials', 'Notes']

function headerRow(): TableRow {
  return new TableRow({
    children: TABLE_HEADERS.map(
      (text) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
        }),
    ),
  })
}

function instanceRow(instance: TechniqueInstance, technique: Technique | undefined): TableRow {
  const cells = [
    `${instance.actualMinutes} min`,
    effectiveName(instance, technique),
    effectiveDescription(instance, technique),
    effectiveMaterials(instance, technique),
    instance.facilitatorNotes,
  ]
  return new TableRow({
    children: cells.map((text) => new TableCell({ children: [new Paragraph(text)] })),
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

    new Paragraph({ text: 'Problem Owner', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      children: [new TextRun({ text: plan.problemOwnerName || 'Not named', bold: true })],
    }),
    new Paragraph(plan.problemOwnerDescription || '—'),

    new Paragraph({ text: 'Problem as Given', heading: HeadingLevel.HEADING_1 }),
    new Paragraph(plan.problemAsGiven || '—'),

    new Paragraph({ text: 'Introduction', heading: HeadingLevel.HEADING_1 }),
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
            return instanceRow(instance, resolveTechnique(instance, techniqueById))
          }),
        ],
      }),
    )
  }

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  const filename = `${plan.name.replace(/[^a-z0-9 -]/gi, '').trim() || 'session-plan'}.docx`
  saveAs(blob, filename)
}
