import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { CalculationResult, ProjectV1 } from '../domain/types'

const A4 = { width: 595.28, height: 841.89 }
const margin = 42
const navy = rgb(0.035, 0.184, 0.42)
const ink = rgb(0.10, 0.14, 0.19)
const muted = rgb(0.34, 0.39, 0.45)
const border = rgb(0.80, 0.83, 0.87)
const pale = rgb(0.95, 0.96, 0.98)

function safe(value: number, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—'
}

function splitText(text: string, maxChars: number) {
  const lines: string[] = []
  let rest = text
  while (rest.length > maxChars) {
    lines.push(rest.slice(0, maxChars))
    rest = rest.slice(maxChars)
  }
  if (rest) lines.push(rest)
  return lines
}

class PdfWriter {
  private page: PDFPage
  private y = A4.height - margin

  constructor(private readonly pdf: PDFDocument, private readonly font: PDFFont, private readonly bold: PDFFont) {
    this.page = pdf.addPage([A4.width, A4.height])
  }

  private ensure(height: number) {
    if (this.y - height < margin) {
      this.page = this.pdf.addPage([A4.width, A4.height])
      this.y = A4.height - margin
    }
  }

  heading(text: string, level = 1) {
    const size = level === 1 ? 19 : 13
    const gap = level === 1 ? 30 : 23
    this.ensure(gap)
    if (level === 1) this.page.drawRectangle({ x: margin, y: this.y - 5, width: 5, height: 21, color: navy })
    this.page.drawText(text, { x: margin + (level === 1 ? 14 : 0), y: this.y, size, font: this.bold, color: level === 1 ? navy : ink })
    this.y -= gap
  }

  paragraph(text: string, color = ink) {
    const lines = splitText(text, 54)
    this.ensure(lines.length * 15 + 7)
    lines.forEach((line) => { this.page.drawText(line, { x: margin, y: this.y, size: 9.5, font: this.font, color }); this.y -= 15 })
    this.y -= 4
  }

  keyValue(rows: Array<[string, string]>) {
    const rowHeight = 22
    this.ensure(rows.length * rowHeight + 8)
    rows.forEach(([key, value], index) => {
      const y = this.y - rowHeight
      this.page.drawRectangle({ x: margin, y, width: A4.width - margin * 2, height: rowHeight, color: index % 2 ? rgb(1, 1, 1) : pale, borderColor: border, borderWidth: 0.5 })
      this.page.drawText(key, { x: margin + 8, y: y + 7, size: 8.5, font: this.font, color: muted })
      this.page.drawText(value, { x: margin + 190, y: y + 7, size: 8.5, font: this.font, color: ink })
      this.y = y
    })
    this.y -= 10
  }

  table(headers: string[], rows: string[][], widths: number[]) {
    const rowHeight = 21
    const tableWidth = A4.width - margin * 2
    const normalized = widths.map((width) => width / widths.reduce((sum, value) => sum + value, 0) * tableWidth)
    const drawRow = (cells: string[], header = false) => {
      this.ensure(rowHeight)
      let x = margin
      cells.forEach((cell, index) => {
        const width = normalized[index]
        this.page.drawRectangle({ x, y: this.y - rowHeight, width, height: rowHeight, color: header ? pale : rgb(1, 1, 1), borderColor: border, borderWidth: 0.5 })
        this.page.drawText(cell.slice(0, 16), { x: x + 4, y: this.y - 14, size: header ? 7.5 : 7.2, font: header ? this.bold : this.font, color: ink })
        x += width
      })
      this.y -= rowHeight
    }
    drawRow(headers, true)
    rows.forEach((row) => drawRow(row))
    this.y -= 11
  }

  sectionSketch(project: ProjectV1) {
    this.ensure(165)
    const g = project.geometry
    const width = 150
    const height = 105
    const x = margin + 180
    const y = this.y - 125
    const wall = Math.max(10, width * g.wallThickness / (g.innerWidth + 2 * g.wallThickness))
    const base = Math.max(12, height * g.baseThickness / (g.innerHeight + g.baseThickness))
    this.page.drawRectangle({ x, y, width, height, color: rgb(0.88, 0.9, 0.92), borderColor: ink, borderWidth: 1 })
    this.page.drawRectangle({ x: x + wall, y: y + base, width: width - wall * 2, height: height - base + 1, color: rgb(0.75, 0.94, 0.96), borderColor: ink, borderWidth: 0.8 })
    this.page.drawText(`B=${g.innerWidth.toFixed(3)} m`, { x: x + 45, y: y - 15, size: 8, font: this.font, color: ink })
    this.page.drawText(`H=${g.innerHeight.toFixed(3)} m`, { x: x - 62, y: y + 45, size: 8, font: this.font, color: ink })
    this.y -= 155
  }
}

export async function createCalculationPdf(project: ProjectV1, result: CalculationResult) {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const fontResponse = await fetch(`${import.meta.env.BASE_URL}fonts/NotoSansCJKjp-Regular.otf`)
  if (!fontResponse.ok) throw new Error('日本語PDFフォントを読み込めません。')
  const fontBytes = await fontResponse.arrayBuffer()
  const font = await pdf.embedFont(fontBytes, { subset: true })
  const bold = font
  const writer = new PdfWriter(pdf, font, bold)

  writer.heading('集水マス 構造計算書')
  writer.paragraph(`案件名：${project.basic.projectTitle}`)
  writer.paragraph(`計算日時：${new Date(result.calculatedAt).toLocaleString('ja-JP')}`, muted)
  writer.paragraph('本計算結果は検証用です。特定基準への適合を保証するものではありません。', rgb(0.65, 0.25, 0.05))

  writer.heading('1. 基本条件', 2)
  writer.keyValue([
    ['構造形式', '鉄筋コンクリート・直壁'],
    ['側壁解析モデル', project.basic.wallModel === 'plate' ? '3辺固定1辺自由板（薄板エネルギー法近似）' : '鉛直片持ち梁'],
    ['計算ケース', '常時／地震時 × 空虚／満水（4ケース）'],
    ['設計水平震度 kh', safe(project.seismic.horizontalCoefficient)],
  ])

  writer.heading('2. 形状寸法', 2)
  writer.keyValue([
    ['内幅 B', `${safe(project.geometry.innerWidth)} m`], ['内奥行 D', `${safe(project.geometry.innerDepth)} m`],
    ['内高さ H', `${safe(project.geometry.innerHeight)} m`], ['壁厚 T1', `${safe(project.geometry.wallThickness)} m`],
    ['底版厚 T2', `${safe(project.geometry.baseThickness)} m`],
  ])
  writer.sectionSketch(project)

  writer.heading('3. 土質・水位・荷重', 2)
  writer.keyValue([
    ['土圧モデル', project.soilWater.pressureMethod === 'rankine' ? 'ランキン主働土圧' : '静止土圧'],
    ['内部摩擦角 φ', `${safe(project.soilWater.frictionAngle)} °`], ['粘着力 c', `${safe(project.soilWater.cohesion)} kN/m²`],
    ['地下水位', `${safe(project.soilWater.externalWaterLevel)} m`], ['満水時内水位', `${safe(project.soilWater.internalWaterLevel)} m`],
    ['等分布上載荷重', `${safe(project.loads.uniformSurcharge)} kN/m²`], ['後輪荷重', `${safe(project.loads.wheelLoad)} kN`],
  ])

  writer.heading('4. 安定計算結果', 2)
  writer.table(
    ['ケース', '浮上りFs', '鉛直合力', '偏心', 'qmin', 'qmax/qa', '判定'],
    Object.values(result.cases).map((item) => [item.label, safe(item.stability.upliftSafetyFactor, 2), safe(item.stability.verticalResultant, 1), safe(item.stability.eccentricity, 3), safe(item.stability.bearingMin, 1), `${safe(item.stability.bearingMax, 1)}/${safe(item.stability.allowableBearing, 1)}`, item.stability.status.toUpperCase()]),
    [1.2, 0.8, 1, 0.7, 0.8, 1.1, 0.7],
  )

  writer.heading('5. 側壁部材照査', 2)
  const wallRows = Object.values(result.cases).flatMap((item) => item.wallChecks.map((check) => [item.label, String(check.face), String(check.direction), safe(check.moment, 2), safe(check.shear, 2), safe(check.concreteStress, 2), safe(check.steelStress, 1), safe(check.utilization, 2), check.status.toUpperCase()]))
  writer.table(['ケース', '壁面', '方向', 'M', 'S', 'σc', 'σs', '検定比', '判定'], wallRows, [1.1, 0.7, 1.1, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7])

  writer.heading('6. 底版部材照査', 2)
  const baseRows = Object.values(result.cases).flatMap((item) => item.baseChecks.map((check) => [item.label, check.direction, safe(check.moment, 2), safe(check.shear, 2), safe(check.requiredAs, 0), check.suggestedBar, safe(check.utilization, 2), check.status.toUpperCase()]))
  writer.table(['ケース', '方向', 'M', 'S', '必要As', '提案配筋', '検定比', '判定'], baseRows, [1.2, 1, 0.7, 0.7, 0.8, 1.2, 0.8, 0.7])

  writer.heading('7. 開口補強', 2)
  const openingRows = result.openings.filter((item) => item.enabled).map((item) => [item.face, item.geometryValid ? 'OK' : '範囲外', safe(item.cutVerticalAs, 0), safe(item.cutHorizontalAs, 0), safe(item.anchorageLength, 0), item.suggestedBar])
  writer.table(['壁面', '形状', '切断縦As', '切断横As', '定着長', '補強提案'], openingRows, [1, 1, 1, 1, 1, 1.4])

  writer.heading('8. 採用式・計算過程', 2)
  result.traces.forEach((item) => {
    writer.paragraph(`${item.label}　${item.formula}`)
    writer.paragraph(`${item.substitution} → ${safe(item.result, 5)} ${item.unit}　根拠：${item.source}`, muted)
  })

  pdf.setTitle(`${project.basic.projectTitle} 集水マス構造計算書`)
  pdf.setSubject('検証用構造計算書')
  pdf.setCreator('集水マス 構造計算 Webアプリ')
  return pdf.save()
}

export async function downloadCalculationPdf(project: ProjectV1, result: CalculationResult) {
  const bytes = await createCalculationPdf(project, result)
  const safeName = project.basic.projectTitle.replace(/[\\/:*?"<>|]/g, '_') || 'calculation'
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeName}_集水マス構造計算書.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}
