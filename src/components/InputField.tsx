import type { ChangeEvent, ReactNode } from 'react'

interface NumberFieldProps {
  label: string
  value: number
  unit?: string
  min?: number
  max?: number
  step?: number
  symbol?: string
  onChange: (value: number) => void
  hint?: ReactNode
}

export function NumberField({ label, value, unit, min, max, step = 0.01, symbol, onChange, hint }: NumberFieldProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.valueAsNumber
    if (Number.isFinite(next)) onChange(next)
  }
  return (
    <label className="field-row">
      <span className="field-label">{label}{symbol ? <b>{symbol}</b> : null}</span>
      <span className="field-control">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={handleChange}
        />
        {unit ? <span className="field-unit">{unit}</span> : null}
      </span>
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

interface SelectFieldProps<T extends string> {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}

export function SelectField<T extends string>({ label, value, options, onChange }: SelectFieldProps<T>) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

export function ToggleField({ label, checked, onChange, description }: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  description?: string
}) {
  return (
    <label className="toggle-field">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-track"><span /></span>
      <span><b>{label}</b>{description ? <small>{description}</small> : null}</span>
    </label>
  )
}
