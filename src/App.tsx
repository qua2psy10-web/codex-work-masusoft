import { useCallback, useEffect, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { EngineeringPreview } from './components/EngineeringPreview'
import { ResultsView } from './components/ResultsView'
import { StepPanels } from './components/StepPanels'
import { StepRail } from './components/StepRail'
import { calculateProject } from './domain/calculate'
import { createDefaultProject } from './domain/defaults'
import { deserializeProject, downloadText, loadProject, saveProject, serializeProject } from './domain/persistence'
import type { CalculationResult, OpeningDefinition, ProjectV1, RebarInput, RebarLayer, WallFace } from './domain/types'

export default function App() {
  const [project, setProject] = useState<ProjectV1>(() => loadProject())
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [notice, setNotice] = useState<string>('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => saveProject(project), 350)
    return () => window.clearTimeout(timer)
  }, [project])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 2800)
    return () => window.clearTimeout(timer)
  }, [notice])

  const update = useCallback(<K extends keyof ProjectV1>(section: K, patch: Partial<ProjectV1[K]>) => {
    setProject((current) => ({
      ...current,
      [section]: {
        ...(current[section] as Record<string, unknown>),
        ...(patch as Record<string, unknown>),
      },
    } as ProjectV1))
  }, [])

  const updateOpening = useCallback((face: WallFace, patch: Partial<OpeningDefinition>) => {
    setProject((current) => ({ ...current, openings: { ...current.openings, [face]: { ...current.openings[face], ...patch } } }))
  }, [])

  const updateLayer = useCallback((key: keyof RebarInput, patch: Partial<RebarLayer>) => {
    setProject((current) => {
      const value = current.rebar[key]
      if (typeof value !== 'object') return current
      return { ...current, rebar: { ...current.rebar, [key]: { ...(value as RebarLayer), ...patch } } }
    })
  }, [])

  const runCalculation = useCallback(() => {
    const next = calculateProject(project)
    setResult(next)
    update('display', { activeStep: 8, resultTab: 'wall' })
    setNotice('4ケースの計算が完了しました。')
  }, [project, update])

  const saveJson = useCallback(() => {
    const saved = saveProject(project)
    setProject(saved)
    const safeName = saved.basic.projectTitle.replace(/[\\/:*?"<>|]/g, '_') || 'project'
    downloadText(serializeProject(saved), `${safeName}.masu.json`, 'application/json')
    setNotice('案件JSONを保存しました。')
  }, [project])

  const exportPdf = useCallback(async () => {
    setNotice('計算書PDFを作成しています…')
    try {
      const calculation = result ?? calculateProject(project)
      if (!result) setResult(calculation)
      const { downloadCalculationPdf } = await import('./pdf/createCalculationPdf')
      await downloadCalculationPdf(project, calculation)
      setNotice('計算書PDFを保存しました。')
    } catch (error) {
      console.error(error)
      setNotice('PDFの作成に失敗しました。')
    }
  }, [project, result])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const next = deserializeProject(await file.text())
      setProject(next)
      setResult(null)
      setNotice('案件JSONを読み込みました。')
    } catch (error) {
      console.error(error)
      setNotice('案件JSONの形式を確認してください。')
    }
  }

  const activeStep = project.display.activeStep
  return (
    <div className="app-shell">
      <AppHeader
        title={project.basic.projectTitle}
        onTitleChange={(projectTitle) => update('basic', { projectTitle })}
        onNew={() => { setProject(createDefaultProject()); setResult(null); setNotice('新しい案件を作成しました。') }}
        onOpen={() => fileInput.current?.click()}
        onSave={saveJson}
        onPdf={exportPdf}
        onCalculate={runCalculation}
        calculated={Boolean(result)}
      />
      <input ref={fileInput} className="visually-hidden" type="file" accept=".json,.masu.json,application/json" onChange={(event) => void handleFile(event.target.files?.[0])} />
      <div className="workspace">
        <StepRail activeStep={activeStep} calculated={Boolean(result)} onStep={(step) => update('display', { activeStep: step })} />
        {activeStep === 8 && result ? (
          <ResultsView
            project={project}
            result={result}
            onInput={() => update('display', { activeStep: 2 })}
            onPdf={exportPdf}
            onRecalculate={runCalculation}
            onTab={(resultTab) => update('display', { resultTab })}
            onModel={(wallModel) => setProject((current) => {
              const next = { ...current, basic: { ...current.basic, wallModel } }
              setResult(calculateProject(next))
              return next
            })}
          />
        ) : activeStep === 8 ? (
          <main className="empty-results"><div><h1>計算結果</h1><p>入力条件を確認し、「計算実行」を押してください。</p><button type="button" onClick={runCalculation}>計算を実行</button></div></main>
        ) : (
          <main className="input-workspace">
            <section className="input-panel"><StepPanels project={project} update={update} updateOpening={updateOpening} updateLayer={updateLayer} /></section>
            <aside className="preview-panel">
              <EngineeringPreview project={project} onMode={(previewMode) => update('display', { previewMode })} />
              <section className="precalc-summary"><div className="precalc-title"><h2>照査結果サマリー</h2><span>計算実行前</span></div><table><thead><tr><th>照査項目</th><th>常時</th><th>地震時</th></tr></thead><tbody>{['浮上がり（安全率）', '支持力（安全率）', '側壁（曲げ・せん断）', '底版（曲げ・せん断）'].map((label) => <tr key={label}><td>{label}</td><td>—</td><td>—</td></tr>)}</tbody></table><p>※ 計算実行後に支配ケースと判定を表示します。</p></section>
            </aside>
          </main>
        )}
      </div>
      {notice ? <div className="toast" role="status">{notice}</div> : null}
    </div>
  )
}
