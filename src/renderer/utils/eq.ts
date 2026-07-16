export const EQ_BAND_COUNT = 10

export const EQ_DEFAULT_FREQUENCIES_HZ = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

export const EQ_MIN_GAIN_DB = -12
export const EQ_MAX_GAIN_DB = 12

export const EQ_MIN_FREQUENCY_HZ = 20
export const EQ_MAX_FREQUENCY_HZ = 20000

export const EQ_MIN_Q = 0.1
export const EQ_MAX_Q = 10
export const EQ_DEFAULT_Q = 1.41

export interface EqBand {
  frequency: number
  q: number
  gain: number
}

export function createDefaultEqBands(): EqBand[] {
  return EQ_DEFAULT_FREQUENCIES_HZ.map((frequency) => ({
    frequency,
    q: EQ_DEFAULT_Q,
    gain: 0
  }))
}
