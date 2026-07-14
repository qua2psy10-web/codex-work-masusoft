import { Download, FilePlus2, FolderOpen, Pencil, Play, Save } from 'lucide-react'

export function AppHeader({ title, onTitleChange, onNew, onOpen, onSave, onPdf, onCalculate, calculated }: {
  title: string
  onTitleChange: (value: string) => void
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onPdf: () => void
  onCalculate: () => void
  calculated: boolean
}) {
  return (
    <header className="app-header">
      <div className="brand">集水マス <span>構造計算</span></div>
      <label className="project-title">
        <span>案件名</span>
        <span className="project-input-wrap">
          <input value={title} onChange={(event) => onTitleChange(event.target.value)} aria-label="案件名" />
          <Pencil size={15} />
        </span>
      </label>
      <div className="header-actions">
        <button type="button" onClick={onNew}><FilePlus2 />新規</button>
        <button type="button" onClick={onOpen}><FolderOpen />開く</button>
        <button type="button" onClick={onSave}><Save />保存</button>
        <button type="button" onClick={onPdf}><Download />計算書PDF</button>
        <button type="button" className="primary" onClick={onCalculate}><Play fill="currentColor" />{calculated ? '再計算' : '計算実行'}</button>
      </div>
    </header>
  )
}
