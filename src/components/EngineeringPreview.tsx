import type { OpeningDefinition, ProjectV1 } from '../domain/types'

function SectionDrawing({ project }: { project: ProjectV1 }) {
  const { innerWidth: b, innerHeight: h, wallThickness: t1, baseThickness: t2 } = project.geometry
  const totalW = b + t1 * 2
  const scaleX = 280 / totalW
  const scaleY = 260 / (h + t2)
  const scale = Math.min(scaleX, scaleY)
  const outerW = totalW * scale
  const innerW = b * scale
  const wall = t1 * scale
  const innerH = h * scale
  const base = t2 * scale
  const x = 215 - outerW / 2
  const top = 56
  const opening: OpeningDefinition = project.openings.front
  const openingSize = (opening.shape === 'circle' ? opening.diameter : opening.width) * scale
  return (
    <svg viewBox="0 0 430 390" role="img" aria-label="集水マス断面図">
      <defs>
        <pattern id="concrete" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill="#eef1f4" />
          <circle cx="4" cy="5" r="0.65" fill="#cbd1d8" />
          <circle cx="14" cy="12" r="0.55" fill="#cbd1d8" />
        </pattern>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8f8fb" />
          <stop offset="1" stopColor="#a9edf2" />
        </linearGradient>
        <marker id="arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#17202b" />
        </marker>
      </defs>
      <path
        d={`M ${x} ${top} H ${x + wall} V ${top + innerH} H ${x + outerW - wall} V ${top} H ${x + outerW} V ${top + innerH + base} H ${x} Z`}
        fill="url(#concrete)" stroke="#17202b" strokeWidth="2"
      />
      <rect x={x + wall} y={top + 1} width={innerW} height={innerH - 1} fill="url(#water)" stroke="#17202b" strokeWidth="1.5" />
      {opening.enabled ? (
        opening.shape === 'circle'
          ? <circle cx={x + wall} cy={top + innerH - opening.centerY * scale} r={openingSize / 2} fill="#fff" stroke="#0f5c73" strokeWidth="2" />
          : <rect x={x + wall - openingSize / 2} y={top + innerH - opening.centerY * scale - opening.height * scale / 2} width={openingSize} height={opening.height * scale} fill="#fff" stroke="#0f5c73" strokeWidth="2" />
      ) : null}
      <g className="dimension-lines" fill="none" stroke="#17202b" strokeWidth="1.3" markerStart="url(#arrow)" markerEnd="url(#arrow)">
        <line x1={x + wall} y1={top + innerH + base + 40} x2={x + outerW - wall} y2={top + innerH + base + 40} />
        <line x1={x - 42} y1={top} x2={x - 42} y2={top + innerH} />
        <line x1={x} y1={top - 26} x2={x + wall} y2={top - 26} />
        <line x1={x + outerW + 38} y1={top + innerH} x2={x + outerW + 38} y2={top + innerH + base} />
      </g>
      <g className="dimension-text" fill="#17202b" fontSize="14" fontWeight="600">
        <text x="215" y={top + innerH + base + 62} textAnchor="middle">B = {b.toFixed(3)} m</text>
        <text x={x - 58} y={top + innerH / 2} textAnchor="middle">H</text>
        <text x={x + wall / 2} y={top - 36} textAnchor="middle">T1</text>
        <text x={x + outerW + 58} y={top + innerH + base / 2}>T2</text>
      </g>
    </svg>
  )
}

function PlanDrawing({ project }: { project: ProjectV1 }) {
  const { innerWidth: b, innerDepth: d, wallThickness: t } = project.geometry
  const scale = Math.min(270 / (b + 2 * t), 230 / (d + 2 * t))
  const ow = (b + 2 * t) * scale
  const od = (d + 2 * t) * scale
  const x = 215 - ow / 2
  const y = 52
  return (
    <svg viewBox="0 0 430 390" role="img" aria-label="集水マス平面図">
      <rect x={x} y={y} width={ow} height={od} fill="#e8ecef" stroke="#17202b" strokeWidth="2" />
      <rect x={x + t * scale} y={y + t * scale} width={b * scale} height={d * scale} fill="#c8f2f5" stroke="#17202b" strokeWidth="1.5" />
      <g fill="#45515f" fontSize="14" fontWeight="600">
        <text x="215" y={y + od + 38} textAnchor="middle">B = {b.toFixed(3)} m</text>
        <text x={x - 45} y={y + od / 2}>D = {d.toFixed(3)} m</text>
      </g>
    </svg>
  )
}

function IsoDrawing({ project }: { project: ProjectV1 }) {
  const { innerWidth: b, innerDepth: d, innerHeight: h } = project.geometry
  return (
    <svg viewBox="0 0 430 390" role="img" aria-label="集水マス等角投影図">
      <g transform="translate(92 82)" stroke="#17202b" strokeWidth="2" strokeLinejoin="round">
        <path d="M0 70 L150 0 L265 58 L114 130 Z" fill="#e6eaee" />
        <path d="M0 70 V240 L114 302 V130 Z" fill="#d5dbe1" />
        <path d="M114 130 V302 L265 230 V58 Z" fill="#f1f3f5" />
        <path d="M34 76 L150 22 L231 63 L114 118 Z" fill="#bceef2" />
        <path d="M34 76 V219 L114 263 V118 Z" fill="#b0e3e8" opacity="0.7" />
        <path d="M114 118 V263 L231 208 V63 Z" fill="#cdf4f6" opacity="0.7" />
      </g>
      <text x="215" y="365" textAnchor="middle" fill="#45515f" fontSize="14">{b.toFixed(2)} × {d.toFixed(2)} × {h.toFixed(2)} m</text>
    </svg>
  )
}

export function EngineeringPreview({ project, onMode }: { project: ProjectV1; onMode: (mode: ProjectV1['display']['previewMode']) => void }) {
  const mode = project.display.previewMode
  return (
    <section className="engineering-preview">
      <div className="preview-heading">
        <h2>形状図</h2>
        <div className="view-switch" role="group" aria-label="図面表示">
          {([['section', '断面'], ['plan', '平面'], ['3d', '3D']] as const).map(([value, label]) => (
            <button type="button" className={mode === value ? 'selected' : ''} key={value} onClick={() => onMode(value)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="preview-canvas">
        {mode === 'section' ? <SectionDrawing project={project} /> : mode === 'plan' ? <PlanDrawing project={project} /> : <IsoDrawing project={project} />}
      </div>
      <p className="drawing-note">※ 図面は入力値に連動した模式図です。</p>
    </section>
  )
}
