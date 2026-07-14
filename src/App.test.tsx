import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('集水マス構造計算UI', () => {
  beforeEach(() => localStorage.clear())

  it('形状入力と連動図を表示する', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '形状寸法', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '集水マス断面図' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '計算実行' })).toBeInTheDocument()
  })

  it('計算実行後に4項目の支配判定と結果表を表示する', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '計算実行' }))
    expect(await screen.findByRole('heading', { name: '計算結果' })).toBeInTheDocument()
    expect(screen.getByText('浮上がり')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '側壁' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: '安定計算' }))
    expect(document.querySelectorAll('.cause-cell').length).toBeGreaterThan(0)
    expect(screen.getByText('赤色のセルはNGの原因となった照査値です。')).toBeInTheDocument()
    expect(screen.getAllByText('本計算結果は検証用です。特定基準への適合を保証するものではありません。').length).toBeGreaterThan(0)
  })
})
