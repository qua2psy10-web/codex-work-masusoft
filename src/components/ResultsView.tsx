import { AlertTriangle, Check, ChevronDown, FileDown, Info, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { CalculationResult, CaseResult, LoadCaseId, MemberCheckResult, ProjectV1, ResultStatus } from '../domain/types'

const caseOrder: LoadCaseId[] = ['static-empty', 'static-full', 'seismic-empty', 'seismic-full']
const faceLabel = { front: '前面', back: '背面', left: '左面', right: '右面', base: '底版' } as const
const directionLabel: Record<MemberCheckResult['direction'], string> = {
  'vertical-inner': '縦・内側', 'vertical-outer': '縦・外側', 'horizontal-inner': '横・内側', 'horizontal-outer': '横・外側',
  'x-top': 'X・上面', 'x-bottom': 'X・下面', 'y-top': 'Y・上面', 'y-bottom': 'Y・下面',
}

function format(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString('ja-JP', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function statusText(status: ResultStatus) {
  if (status === 'ok') return 'OK'
  if (status === 'warning') return '要確認'
  if (status === 'ng') return 'NG'
  return '範囲外'
}

function StatusIcon({ status }: { status: ResultStatus }) {
  return status === 'ok' ? <Check /> : <AlertTriangle />
}

function governingStatus(result: CalculationResult, project: ProjectV1, kind: 'uplift' | 'bearing' | 'wall' | 'base') {
  const caseId = result.governing[kind]
  const item = result.cases[caseId]
  if (kind === 'uplift') {
    const ratio = item.stability.upliftSafetyFactor
    return { caseId, status: ratio >= project.basic.upliftSafetyFactor ? 'ok' as const : 'ng' as const }
  }
  if (kind === 'bearing') return { caseId, status: item.stability.bearingStatus }
  const checks = kind === 'wall' ? item.wallChecks : item.baseChecks
  let status: ResultStatus = 'ok'
  for (const check of checks) {
    if (check.status === 'ng' || check.status === 'out-of-range') return { caseId, status: check.status }
    if (check.status === 'warning') status = 'warning'
  }
  return { caseId, status }
}

function Summary({ result, project }: { result: CalculationResult; project: ProjectV1 }) {
  return (
    <div className="result-summary">
      {([['uplift', '浮上がり'], ['bearing', '支持力'], ['wall', '側壁'], ['base', '底版']] as const).map(([kind, label]) => {
        const value = governingStatus(result, project, kind)
        return <div key={kind}><span>{label}</span><b className={`status-${value.status}`}><StatusIcon status={value.status} />{statusText(value.status)}</b><small>{result.cases[value.caseId].label}</small></div>
      })}
    </div>
  )
}

function LoadDiagram({ project, selected }: { project: ProjectV1; selected: MemberCheckResult }) {
  const h = project.geometry.innerHeight
  return (
    <svg className="load-diagram" viewBox="0 0 420 310" role="img" aria-label="側壁荷重図">
      <defs><marker id="load-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#27313d" /></marker></defs>
      <g transform="translate(170 38)">
        <path d="M35 0 H78 V215 H104 V240 H8 V215 H35 Z" fill="#e7ebef" stroke="#1e2732" strokeWidth="2" />
        <path d="M35 18 H78" stroke="#74808c" strokeDasharray="3 4" />
        {[42, 78, 114, 150, 186].map((y, index) => <circle key={y} cx={46 + (index % 2) * 20} cy={y} r="2.4" fill="#1e2732" />)}
        <path d="M-70 205 L16 205 L16 25 Z" fill="#eef3f7" stroke="#27313d" strokeWidth="1.2" />
        {[48, 82, 116, 150, 184].map((y, index) => <line key={y} x1={-52 + index * 12} y1={y} x2={27} y2={y} stroke="#27313d" markerEnd="url(#load-arrow)" />)}
        <line x1="120" y1="4" x2="120" y2="215" stroke="#27313d" />
        <line x1="112" y1="4" x2="128" y2="4" stroke="#27313d" />
        <line x1="112" y1="215" x2="128" y2="215" stroke="#27313d" />
        <text x="136" y="112" fontSize="14" fill="#27313d">H = {h.toFixed(2)} m</text>
        <text x="-76" y="232" fontSize="13" fill="#45515f">外側土圧</text>
        <text x="42" y="264" textAnchor="middle" fontSize="13" fill="#45515f">固定（3辺固定）</text>
      </g>
      <text x="12" y="24" fontSize="14" fontWeight="600" fill="#1e2732">{faceLabel[selected.face]}（{directionLabel[selected.direction]}）</text>
    </svg>
  )
}

function MemberTable({ project, checks, selectedId, onSelect }: { project: ProjectV1; checks: MemberCheckResult[]; selectedId: string; onSelect: (check: MemberCheckResult) => void }) {
  return (
    <div className="result-table-wrap">
      <table className="result-table">
        <thead><tr><th>壁面</th><th>方向・面</th><th>ケース</th><th>M<br /><small>kN·m/m</small></th><th>S<br /><small>kN/m</small></th><th>σc / σca</th><th>σs / σsa</th><th>τ / τa</th><th>必要As / 採用As<br /><small>mm²/m</small></th><th>判定</th></tr></thead>
        <tbody>{checks.map((check) => (
          <tr key={check.id} className={check.id === selectedId ? 'selected' : ''} onClick={() => onSelect(check)}>
            <td>{faceLabel[check.face]}</td><td>{directionLabel[check.direction]}</td><td>{caseOrder.includes(check.caseId) ? check.caseId.replace('static-', '常時・').replace('seismic-', '地震時・').replace('empty', '空虚').replace('full', '満水') : check.caseId}</td>
            <td>{format(check.moment, 2)}</td><td>{format(check.shear, 2)}</td>
            <td className={check.concreteStress > project.rebar.allowableConcreteCompression ? 'cause-cell' : ''}>{format(check.concreteStress)} / {format(project.rebar.allowableConcreteCompression)}</td>
            <td className={check.steelStress > project.rebar.allowableSteelTension ? 'cause-cell' : ''}>{format(check.steelStress)} / {format(project.rebar.allowableSteelTension)}</td>
            <td className={check.shearStress > project.rebar.allowableConcreteShear ? 'cause-cell' : ''}>{format(check.shearStress)} / {format(project.rebar.allowableConcreteShear)}</td>
            <td className={check.requiredAs > check.providedAs ? 'cause-cell' : ''}>{format(check.requiredAs, 0)} / {format(check.providedAs, 0)}</td>
            <td><b className={`status-${check.status}`}><StatusIcon status={check.status} />{statusText(check.status)}</b></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function StabilityTable({ project, result }: { project: ProjectV1; result: CalculationResult }) {
  return <div className="result-table-wrap"><table className="result-table stability-table"><thead><tr><th>ケース</th><th>抵抗重量</th><th>浮力</th><th>安全率 / 必要値</th><th>鉛直合力</th><th>偏心量</th><th>接地状態</th><th>qmin</th><th>qmax / qa</th><th>支持力判定</th></tr></thead><tbody>{caseOrder.map((id) => { const item = result.cases[id]; const outsideBase = item.stability.contactState === 'none'; return <tr key={id}><td>{item.label}</td><td>{format(item.stability.resistingWeight)} kN</td><td>{format(item.stability.upliftForce)} kN</td><td className={item.stability.upliftStatus === 'ng' ? 'cause-cell' : ''}>{format(item.stability.upliftSafetyFactor)} / {format(project.basic.upliftSafetyFactor)}</td><td className={item.stability.verticalResultant <= 0 ? 'cause-cell' : ''}>{format(item.stability.verticalResultant)} kN</td><td className={outsideBase ? 'cause-cell' : ''}>{format(item.stability.eccentricity, 3)} m</td><td className={outsideBase ? 'cause-cell' : ''}>{item.stability.contactState === 'full' ? '全面' : item.stability.contactState === 'partial' ? `部分 ${format(item.stability.contactRatio * 100, 1)}%` : '接地不能'}</td><td>{format(item.stability.bearingMin)} kN/m²</td><td className={item.stability.bearingMax > item.stability.allowableBearing ? 'cause-cell' : ''}>{format(item.stability.bearingMax)} / {format(item.stability.allowableBearing)}</td><td><b className={`status-${item.stability.bearingStatus}`}><StatusIcon status={item.stability.bearingStatus} />{statusText(item.stability.bearingStatus)}</b></td></tr> })}</tbody></table></div>
}

function OpeningTable({ result }: { result: CalculationResult }) {
  return <div className="result-table-wrap"><table className="result-table"><thead><tr><th>壁面</th><th>形状判定</th><th>切断縦筋</th><th>切断横筋</th><th>片側必要縦筋</th><th>片側必要横筋</th><th>定着長</th><th>補強提案</th><th>判定</th></tr></thead><tbody>{result.openings.filter((item) => item.enabled).map((item) => <tr key={item.face}><td>{faceLabel[item.face]}</td><td className={!item.geometryValid ? 'cause-cell' : ''}>{item.geometryValid ? '離隔OK' : '離隔不足'}</td><td>{format(item.cutVerticalAs, 0)} mm²</td><td>{format(item.cutHorizontalAs, 0)} mm²</td><td>{format(item.requiredVerticalAsEachSide, 0)} mm²</td><td>{format(item.requiredHorizontalAsEachSide, 0)} mm²</td><td>{format(item.anchorageLength, 0)} mm</td><td>{item.suggestedBar}</td><td><b className={`status-${item.status}`}><StatusIcon status={item.status} />{statusText(item.status)}</b></td></tr>)}</tbody></table></div>
}

function TraceTable({ result }: { result: CalculationResult }) {
  return <div className="trace-list">{result.traces.map((item) => <details key={item.id}><summary><span>{item.category}</span><b>{item.label}</b><strong>{format(item.result, 4)} {item.unit}</strong><ChevronDown /></summary><div><code>{item.formula}</code><p>{item.substitution}</p><small>根拠：{item.source}</small></div></details>)}</div>
}

export function ResultsView({ project, result, onInput, onPdf, onRecalculate, onTab, onModel }: {
  project: ProjectV1
  result: CalculationResult
  onInput: () => void
  onPdf: () => void
  onRecalculate: () => void
  onTab: (tab: ProjectV1['display']['resultTab']) => void
  onModel: (model: ProjectV1['basic']['wallModel']) => void
}) {
  const tab = project.display.resultTab
  const governingWallCase = result.cases[result.governing.wall]
  const allWallChecks = useMemo(() => caseOrder.flatMap((id) => result.cases[id].wallChecks), [result])
  const allBaseChecks = useMemo(() => caseOrder.flatMap((id) => result.cases[id].baseChecks), [result])
  const defaultCheck = tab === 'base' ? allBaseChecks[0] : governingWallCase.wallChecks[0]
  const [selected, setSelected] = useState<MemberCheckResult>(defaultCheck)
  const activeChecks = tab === 'base' ? allBaseChecks : allWallChecks
  const activeSelected = activeChecks.find((check) => check.id === selected.id) ?? activeChecks[0]

  return (
    <main className="results-view">
      <div className="results-title"><div><h1>計算結果</h1><span>入力条件から算定済み</span></div><button type="button" onClick={onInput}><Info />入力データの確認</button><button type="button" onClick={onRecalculate}><RefreshCw />再計算</button></div>
      <Summary result={result} project={project} />
      <div className="results-tabs" role="tablist">
        {([['stability', '安定計算'], ['wall', '側壁'], ['base', '底版'], ['opening', '開口補強'], ['trace', '計算過程']] as const).map(([value, label]) => <button type="button" role="tab" aria-selected={tab === value} className={tab === value ? 'active' : ''} key={value} onClick={() => onTab(value)}>{label}</button>)}
      </div>
      {tab !== 'trace' ? <p className="cause-legend"><span />赤色のセルはNGの原因となった照査値です。</p> : null}
      {tab === 'stability' ? <StabilityTable project={project} result={result} /> : null}
      {tab === 'opening' ? <OpeningTable result={result} /> : null}
      {tab === 'trace' ? <TraceTable result={result} /> : null}
      {tab === 'wall' || tab === 'base' ? (
        <div className="member-results">
          <section className="member-table-panel">
            <div className="model-toolbar">
              <label>解析モデル<select value={project.basic.wallModel} disabled={tab === 'base'} onChange={(event) => onModel(event.target.value as ProjectV1['basic']['wallModel'])}><option value="plate">3辺固定1辺自由板</option><option value="cantilever">鉛直片持ち梁</option></select></label>
              <span>選択行に連動して支配断面を表示</span>
            </div>
            <MemberTable project={project} checks={activeChecks} selectedId={activeSelected.id} onSelect={setSelected} />
            <details className="coefficient-details"><summary>採用係数と計算過程を表示 <ChevronDown /></summary><p>「計算過程」タブで、式・代入値・丸め前の結果を確認できます。</p></details>
          </section>
          <aside className="result-detail">
            <LoadDiagram project={project} selected={activeSelected} />
            <h2>支配断面</h2>
            <dl><div><dt>位置</dt><dd>{faceLabel[activeSelected.face]}・{directionLabel[activeSelected.direction]}</dd></div><div><dt>曲げモーメント M</dt><dd>{format(activeSelected.moment)} kN·m/m</dd></div><div><dt>せん断力 S</dt><dd>{format(activeSelected.shear)} kN/m</dd></div></dl>
            <h2>検定結果</h2>
            <dl><div><dt>必要鉄筋量 As</dt><dd>{format(activeSelected.requiredAs, 0)} mm²/m</dd></div><div><dt>採用鉄筋</dt><dd>{activeSelected.suggestedBar}<small>As = {format(activeSelected.providedAs, 0)} mm²/m</small></dd></div><div className="util-row"><dt>検定比</dt><dd><span className="util-track"><i style={{ width: `${Math.min(activeSelected.utilization, 1) * 100}%` }} /></span><b>{format(activeSelected.utilization)}</b></dd></div></dl>
            <button type="button" className="detail-pdf" onClick={onPdf}><FileDown />{tab === 'wall' ? '側壁' : '底版'}の計算書PDF</button>
          </aside>
        </div>
      ) : null}
      {result.warnings.length ? <div className="result-warnings">{result.warnings.map((warning) => <p key={warning}><AlertTriangle />{warning}</p>)}</div> : null}
      <p className="disclaimer">本計算結果は検証用です。特定基準への適合を保証するものではありません。</p>
    </main>
  )
}
