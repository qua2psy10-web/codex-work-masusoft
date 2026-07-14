import { AlertTriangle, CircleHelp } from 'lucide-react'
import { NumberField, SelectField, ToggleField } from './InputField'
import type { OpeningDefinition, ProjectV1, RebarInput, RebarLayer, WallFace } from '../domain/types'

type SectionUpdater<K extends keyof ProjectV1> = (section: K, patch: Partial<ProjectV1[K]>) => void

const faceLabels: Record<WallFace, string> = { front: '前面', back: '背面', left: '左面', right: '右面' }

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="panel-header">
      <div><h1>{title}</h1><p>{description}</p></div>
      <button type="button" className="help-button"><CircleHelp />ヘルプ</button>
    </div>
  )
}

function BasicPanel({ project, update }: { project: ProjectV1; update: SectionUpdater<'basic'> }) {
  const input = project.basic
  return (
    <>
      <PanelHeader title="基本条件" description="計算項目と解析モデルを設定してください。" />
      <section className="form-section"><h2>計算・設計項目</h2>
        <div className="toggle-grid">
          <ToggleField label="安定計算" description="浮上がり・支持力" checked={input.runStability} onChange={(runStability) => update('basic', { runStability })} />
          <ToggleField label="部材計算" description="側壁・底版・開口補強" checked={input.runMembers} onChange={(runMembers) => update('basic', { runMembers })} />
        </div>
      </section>
      <section className="form-section"><h2>側壁解析モデル</h2>
        <div className="choice-cards">
          <label className={input.wallModel === 'plate' ? 'selected' : ''}><input type="radio" checked={input.wallModel === 'plate'} onChange={() => update('basic', { wallModel: 'plate' })} /><b>3辺固定1辺自由板</b><span>薄板エネルギー法で二方向の断面力を算定</span></label>
          <label className={input.wallModel === 'cantilever' ? 'selected' : ''}><input type="radio" checked={input.wallModel === 'cantilever'} onChange={() => update('basic', { wallModel: 'cantilever' })} /><b>鉛直片持ち梁</b><span>壁1 m幅を底版固定の片持ち梁として算定</span></label>
        </div>
      </section>
      <section className="form-section"><h2>材料・安定条件</h2>
        <NumberField label="コンクリート単位体積重量" value={input.concreteUnitWeight} unit="kN/m³" onChange={(concreteUnitWeight) => update('basic', { concreteUnitWeight })} />
        <NumberField label="必要浮上がり安全率" value={input.upliftSafetyFactor} unit="—" onChange={(upliftSafetyFactor) => update('basic', { upliftSafetyFactor })} />
      </section>
    </>
  )
}

function GeometryPanel({ project, update }: { project: ProjectV1; update: SectionUpdater<'geometry'> }) {
  const input = project.geometry
  return (
    <>
      <PanelHeader title="形状寸法" description="集水マスの形状・寸法を入力してください。" />
      <section className="form-section"><h2>構造・壁形状</h2>
        <div className="select-grid">
          <SelectField label="構造形式" value="rc" options={[{ value: 'rc', label: '鉄筋コンクリート' }]} onChange={() => undefined} />
          <SelectField label="側壁形状" value="straight" options={[{ value: 'straight', label: '直壁' }]} onChange={() => undefined} />
        </div>
      </section>
      <section className="form-section"><h2>形状寸法</h2>
        <NumberField label="内幅（左右内面）" symbol="B" value={input.innerWidth} unit="m" max={10} onChange={(innerWidth) => update('geometry', { innerWidth })} />
        <NumberField label="内奥行（前後内面）" symbol="D" value={input.innerDepth} unit="m" max={10} onChange={(innerDepth) => update('geometry', { innerDepth })} />
        <NumberField label="内高さ" symbol="H" value={input.innerHeight} unit="m" max={5} onChange={(innerHeight) => update('geometry', { innerHeight })} />
        <NumberField label="壁厚" symbol="T1" value={input.wallThickness} unit="m" max={1} onChange={(wallThickness) => update('geometry', { wallThickness })} />
        <NumberField label="底版厚" symbol="T2" value={input.baseThickness} unit="m" max={1} onChange={(baseThickness) => update('geometry', { baseThickness })} />
        <p className="section-note">※ 寸法は内のりを基準としています。</p>
      </section>
    </>
  )
}

function OpeningFields({ item, wallWidth, wallHeight, onChange }: {
  item: OpeningDefinition
  wallWidth: number
  wallHeight: number
  onChange: (patch: Partial<OpeningDefinition>) => void
}) {
  const width = item.shape === 'circle' ? item.diameter : item.width
  const height = item.shape === 'circle' ? item.diameter : item.height
  const invalid = item.enabled && (item.centerX - width / 2 < 0.1 || wallWidth - item.centerX - width / 2 < 0.1 || item.centerY - height / 2 < 0.1 || wallHeight - item.centerY - height / 2 < 0.1)
  return (
    <div className={`opening-block ${item.enabled ? '' : 'disabled'}`}>
      <ToggleField label={`${faceLabels[item.face]}開口`} checked={item.enabled} onChange={(enabled) => onChange({ enabled })} />
      {item.enabled ? <>
        <SelectField label="開口形状" value={item.shape} options={[{ value: 'circle', label: '円形' }, { value: 'rectangle', label: '矩形' }]} onChange={(shape) => onChange({ shape })} />
        {item.shape === 'circle'
          ? <NumberField label="開口径" value={item.diameter} unit="m" onChange={(diameter) => onChange({ diameter })} />
          : <><NumberField label="開口幅" value={item.width} unit="m" onChange={(value) => onChange({ width: value })} /><NumberField label="開口高さ" value={item.height} unit="m" onChange={(value) => onChange({ height: value })} /></>}
        <NumberField label="水平中心位置" value={item.centerX} unit="m" onChange={(centerX) => onChange({ centerX })} />
        <NumberField label="底版上面からの中心高さ" value={item.centerY} unit="m" onChange={(centerY) => onChange({ centerY })} />
        {invalid ? <p className="inline-warning"><AlertTriangle />開口端から壁端まで100 mm以上確保してください。</p> : null}
      </> : <p className="muted-copy">この面には開口を設けません。</p>}
    </div>
  )
}

function OpeningPanel({ project, updateOpening }: { project: ProjectV1; updateOpening: (face: WallFace, patch: Partial<OpeningDefinition>) => void }) {
  return (
    <>
      <PanelHeader title="開口部" description="各壁面に円形または矩形の開口を1か所まで設定できます。" />
      <section className="form-section"><h2>壁面別開口</h2>
        <div className="opening-grid">
          {(['front', 'back', 'left', 'right'] as WallFace[]).map((face) => (
            <OpeningFields
              key={face}
              item={project.openings[face]}
              wallWidth={face === 'front' || face === 'back' ? project.geometry.innerWidth : project.geometry.innerDepth}
              wallHeight={project.geometry.innerHeight}
              onChange={(patch) => updateOpening(face, patch)}
            />
          ))}
        </div>
      </section>
    </>
  )
}

function SoilPanel({ project, update }: { project: ProjectV1; update: SectionUpdater<'soilWater'> }) {
  const input = project.soilWater
  return (
    <>
      <PanelHeader title="土質・水位" description="背面土と内外水位の条件を入力してください。" />
      <section className="form-section"><h2>土圧モデル</h2>
        <SelectField label="常時土圧" value={input.pressureMethod} options={[{ value: 'rankine', label: 'ランキン主働土圧' }, { value: 'at-rest', label: '静止土圧' }]} onChange={(pressureMethod) => update('soilWater', { pressureMethod })} />
        <div className="field-grid compact">
          <NumberField label="内部摩擦角" symbol="φ" value={input.frictionAngle} unit="°" onChange={(frictionAngle) => update('soilWater', { frictionAngle })} />
          <NumberField label="粘着力" symbol="c" value={input.cohesion} unit="kN/m²" onChange={(cohesion) => update('soilWater', { cohesion })} />
          <NumberField label="湿潤単位体積重量" symbol="γ" value={input.unitWeight} unit="kN/m³" onChange={(unitWeight) => update('soilWater', { unitWeight })} />
          <NumberField label="飽和単位体積重量" symbol="γsat" value={input.saturatedUnitWeight} unit="kN/m³" onChange={(saturatedUnitWeight) => update('soilWater', { saturatedUnitWeight })} />
        </div>
      </section>
      <section className="form-section"><h2>水位</h2>
        <NumberField label="地下水位（底版上面基準）" value={input.externalWaterLevel} unit="m" onChange={(externalWaterLevel) => update('soilWater', { externalWaterLevel })} />
        <NumberField label="満水時の内水位" value={input.internalWaterLevel} unit="m" onChange={(internalWaterLevel) => update('soilWater', { internalWaterLevel })} />
        <NumberField label="水の単位体積重量" value={input.waterUnitWeight} unit="kN/m³" onChange={(waterUnitWeight) => update('soilWater', { waterUnitWeight })} />
      </section>
      <section className="form-section"><h2>支持力条件</h2>
        <NumberField label="地盤の許容支持力度" value={input.allowableBearing} unit="kN/m²" onChange={(allowableBearing) => update('soilWater', { allowableBearing })} />
        <ToggleField label="テルツァギー式の参考値を採用" checked={input.useTerzaghiReference} onChange={(useTerzaghiReference) => update('soilWater', { useTerzaghiReference })} description="通常は地盤調査値を使用" />
      </section>
    </>
  )
}

function LoadPanel({ project, update }: { project: ProjectV1; update: SectionUpdater<'loads'> }) {
  const input = project.loads
  return (
    <>
      <PanelHeader title="荷重" description="上載荷重、蓋荷重、自動車後輪荷重を設定してください。" />
      <section className="form-section"><h2>鉛直・上載荷重</h2>
        <NumberField label="等分布上載荷重" value={input.uniformSurcharge} unit="kN/m²" onChange={(uniformSurcharge) => update('loads', { uniformSurcharge })} />
        <NumberField label="蓋自重（合計）" value={input.coverDeadLoad} unit="kN" onChange={(coverDeadLoad) => update('loads', { coverDeadLoad })} />
      </section>
      <section className="form-section"><h2>自動車荷重</h2>
        <ToggleField label="後輪荷重を考慮" checked={input.vehicleEnabled} onChange={(vehicleEnabled) => update('loads', { vehicleEnabled })} />
        <NumberField label="後輪荷重" symbol="P" value={input.wheelLoad} unit="kN" onChange={(wheelLoad) => update('loads', { wheelLoad })} />
        <NumberField label="接地幅" symbol="a" value={input.contactWidth} unit="m" onChange={(contactWidth) => update('loads', { contactWidth })} />
        <NumberField label="接地長" symbol="b" value={input.contactLength} unit="m" onChange={(contactLength) => update('loads', { contactLength })} />
        <NumberField label="衝撃係数" symbol="i" value={input.impactFactor} unit="—" onChange={(impactFactor) => update('loads', { impactFactor })} />
        <NumberField label="分散角" symbol="α" value={input.dispersionAngle} unit="°" onChange={(dispersionAngle) => update('loads', { dispersionAngle })} />
      </section>
    </>
  )
}

function SeismicPanel({ project, updateSoil, updateSeismic }: { project: ProjectV1; updateSoil: SectionUpdater<'soilWater'>; updateSeismic: SectionUpdater<'seismic'> }) {
  return (
    <>
      <PanelHeader title="地震条件" description="水平震度と地震時土圧係数の扱いを設定してください。" />
      <section className="form-section"><h2>震度法</h2>
        <NumberField label="設計水平震度" symbol="kh" value={project.seismic.horizontalCoefficient} unit="—" max={0.5} onChange={(horizontalCoefficient) => updateSeismic('seismic', { horizontalCoefficient })} />
        <p className="formula-callout">地震時は構造物・内容物の慣性力と物部・岡部式による地震時土圧を静的に合成します。</p>
      </section>
      <section className="form-section"><h2>係数の手動上書き</h2>
        <label className="optional-number"><span>常時土圧係数 K</span><input type="number" step="0.001" placeholder="自動計算" value={project.soilWater.manualStaticCoefficient ?? ''} onChange={(event) => updateSoil('soilWater', { manualStaticCoefficient: event.target.value === '' ? null : Number(event.target.value) })} /></label>
        <label className="optional-number"><span>地震時土圧係数 Kae</span><input type="number" step="0.001" placeholder="自動計算" value={project.soilWater.manualSeismicCoefficient ?? ''} onChange={(event) => updateSoil('soilWater', { manualSeismicCoefficient: event.target.value === '' ? null : Number(event.target.value) })} /></label>
      </section>
    </>
  )
}

const rebarFields: Array<{ key: keyof Pick<RebarInput, 'wallVerticalInner' | 'wallVerticalOuter' | 'wallHorizontalInner' | 'wallHorizontalOuter' | 'baseTopX' | 'baseTopY' | 'baseBottomX' | 'baseBottomY'>; label: string }> = [
  { key: 'wallVerticalInner', label: '側壁 縦・内側' }, { key: 'wallVerticalOuter', label: '側壁 縦・外側' },
  { key: 'wallHorizontalInner', label: '側壁 横・内側' }, { key: 'wallHorizontalOuter', label: '側壁 横・外側' },
  { key: 'baseTopX', label: '底版 上面・X' }, { key: 'baseTopY', label: '底版 上面・Y' },
  { key: 'baseBottomX', label: '底版 下面・X' }, { key: 'baseBottomY', label: '底版 下面・Y' },
]

function RebarPanel({ project, update, updateLayer }: { project: ProjectV1; update: SectionUpdater<'rebar'>; updateLayer: (key: keyof RebarInput, patch: Partial<RebarLayer>) => void }) {
  const input = project.rebar
  return (
    <>
      <PanelHeader title="配筋" description="側壁内外面と底版上下両面の配筋を設定してください。" />
      <section className="form-section"><h2>採用配筋</h2>
        <div className="rebar-table">
          <div className="rebar-head"><span>位置</span><span>径</span><span>ピッチ</span></div>
          {rebarFields.map(({ key, label }) => {
            const layer = input[key]
            return <div className="rebar-row" key={key}><b>{label}</b><select value={layer.diameter} onChange={(event) => updateLayer(key, { diameter: Number(event.target.value) })}>{[10, 13, 16, 19, 22, 25].map((d) => <option key={d} value={d}>D{d}</option>)}</select><span><input type="number" value={layer.spacing} min="50" step="25" onChange={(event) => updateLayer(key, { spacing: Number(event.target.value) })} /> mm</span></div>
          })}
        </div>
      </section>
      <section className="form-section"><h2>材料許容値</h2>
        <div className="field-grid compact">
          <NumberField label="かぶり" value={input.cover} unit="mm" onChange={(cover) => update('rebar', { cover })} />
          <NumberField label="許容コンクリート圧縮" value={input.allowableConcreteCompression} unit="N/mm²" onChange={(allowableConcreteCompression) => update('rebar', { allowableConcreteCompression })} />
          <NumberField label="許容鉄筋引張" value={input.allowableSteelTension} unit="N/mm²" onChange={(allowableSteelTension) => update('rebar', { allowableSteelTension })} />
          <NumberField label="許容コンクリートせん断" value={input.allowableConcreteShear} unit="N/mm²" onChange={(allowableConcreteShear) => update('rebar', { allowableConcreteShear })} />
          <NumberField label="許容付着応力度" value={input.allowableBond} unit="N/mm²" onChange={(allowableBond) => update('rebar', { allowableBond })} />
          <NumberField label="最小鉄筋比" value={input.minimumRebarRatio} unit="—" step={0.0001} onChange={(minimumRebarRatio) => update('rebar', { minimumRebarRatio })} />
        </div>
      </section>
    </>
  )
}

export function StepPanels({ project, update, updateOpening, updateLayer }: {
  project: ProjectV1
  update: <K extends keyof ProjectV1>(section: K, patch: Partial<ProjectV1[K]>) => void
  updateOpening: (face: WallFace, patch: Partial<OpeningDefinition>) => void
  updateLayer: (key: keyof RebarInput, patch: Partial<RebarLayer>) => void
}) {
  switch (project.display.activeStep) {
    case 1: return <BasicPanel project={project} update={update} />
    case 2: return <GeometryPanel project={project} update={update} />
    case 3: return <OpeningPanel project={project} updateOpening={updateOpening} />
    case 4: return <SoilPanel project={project} update={update} />
    case 5: return <LoadPanel project={project} update={update} />
    case 6: return <SeismicPanel project={project} updateSoil={update} updateSeismic={update} />
    case 7: return <RebarPanel project={project} update={update} updateLayer={updateLayer} />
    default: return null
  }
}
