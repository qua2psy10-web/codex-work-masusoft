import { Check, FileSearch } from 'lucide-react'

const steps = [
  '基本条件', '形状寸法', '開口部', '土質・水位', '荷重', '地震条件', '配筋', '計算結果',
]

export function StepRail({ activeStep, calculated, onStep }: {
  activeStep: number
  calculated: boolean
  onStep: (step: number) => void
}) {
  return (
    <aside className="step-rail">
      <nav aria-label="入力工程">
        {steps.map((label, index) => {
          const step = index + 1
          const complete = step < 8 || calculated
          return (
            <button
              type="button"
              key={label}
              className={activeStep === step ? 'active' : ''}
              onClick={() => onStep(step)}
            >
              <span className="step-number">{step}</span>
              <span className="step-copy"><b>{label}</b><small>{step === 8 ? (calculated ? '計算済み' : '未計算') : '入力済み'}</small></span>
              {complete ? <span className="step-check"><Check /></span> : null}
            </button>
          )
        })}
      </nav>
      <button type="button" className="review-button"><FileSearch />入力データの確認</button>
    </aside>
  )
}
