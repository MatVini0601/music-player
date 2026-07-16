import { Fragment, useEffect, useState } from 'react'
import {
  EQ_MAX_FREQUENCY_HZ,
  EQ_MAX_GAIN_DB,
  EQ_MAX_Q,
  EQ_MIN_FREQUENCY_HZ,
  EQ_MIN_GAIN_DB,
  EQ_MIN_Q,
  type EqBand
} from '../utils/eq'

interface EqNumberInputProps {
  value: number
  min: number
  max: number
  step: number
  title?: string
  onCommit: (value: number) => void
}

// Free-typed number input: applies live (unclamped) values as the user types so partial input
// like "6" -> "60" -> "600" isn't stomped by min/max clamping, then clamps once on blur/Enter.
function EqNumberInput({ value, min, max, step, title, onCommit }: EqNumberInputProps) {
  const [text, setText] = useState(String(value))

  useEffect(() => {
    setText(String(value))
  }, [value])

  const commitClamped = (): void => {
    const parsed = Number(text)
    const clamped =
      Number.isFinite(parsed) && text !== '' ? Math.min(max, Math.max(min, parsed)) : value
    onCommit(clamped)
    setText(String(clamped))
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={text}
      title={title}
      onChange={(e) => {
        setText(e.target.value)
        const parsed = Number(e.target.value)
        if (e.target.value !== '' && Number.isFinite(parsed)) onCommit(parsed)
      }}
      onBlur={commitClamped}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className="w-14 rounded-md bg-white/5 px-1 py-1 text-center text-xs text-gray-100 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  )
}

interface EqBandsEditorProps {
  bands: EqBand[]
  onChangeBand: (bandIndex: number, patch: Partial<EqBand>) => void
  /** Extra layout classes: e.g. "w-fit" (compact, modal) or "w-full auto-cols-fr" (stretch). */
  className?: string
}

// Bands laid out horizontally, one column each: gain readout, vertical gain slider,
// then frequency and Q inputs. The leading column carries the unit legend.
export function EqBandsEditor({ bands, onChangeBand, className = 'w-fit' }: EqBandsEditorProps) {
  return (
    <div
      className={`grid grid-flow-col grid-cols-[auto] grid-rows-[auto_auto_auto_auto] items-center justify-items-center gap-x-2 gap-y-2 ${className}`}
    >
      <span />
      <span />
      <span className="pr-1 text-[11px] uppercase text-gray-600">Hz</span>
      <span className="pr-1 text-[11px] uppercase text-gray-600">Q</span>

      {bands.map((band, index) => (
        <Fragment key={index}>
          <span className="text-xs tabular-nums text-gray-500">
            {band.gain > 0 ? `+${band.gain}` : band.gain}
          </span>
          <input
            type="range"
            min={EQ_MIN_GAIN_DB}
            max={EQ_MAX_GAIN_DB}
            step={0.5}
            value={band.gain}
            onChange={(e) => onChangeBand(index, { gain: Number(e.target.value) })}
            className="accent-accent"
            style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '9rem' }}
            aria-label={`Band ${index + 1} gain`}
          />
          <EqNumberInput
            value={band.frequency}
            min={EQ_MIN_FREQUENCY_HZ}
            max={EQ_MAX_FREQUENCY_HZ}
            step={1}
            title="Frequency (Hz)"
            onCommit={(frequency) => onChangeBand(index, { frequency })}
          />
          <EqNumberInput
            value={band.q}
            min={EQ_MIN_Q}
            max={EQ_MAX_Q}
            step={0.1}
            title="Q factor"
            onCommit={(q) => onChangeBand(index, { q })}
          />
        </Fragment>
      ))}
    </div>
  )
}
