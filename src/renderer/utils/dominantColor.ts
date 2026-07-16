/** Samples an image's average color and darkens it slightly for use as a hero-banner gradient start. */
export function getDominantColor(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    // Art is served over mediafile:// now; without CORS opt-in the canvas would be
    // tainted and getImageData would throw.
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const size = 32
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }

        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)

        let r = 0
        let g = 0
        let b = 0
        let count = 0

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count++
        }

        if (count === 0) {
          resolve(null)
          return
        }

        const darken = 0.6
        r = Math.round((r / count) * darken)
        g = Math.round((g / count) * darken)
        b = Math.round((b / count) * darken)

        resolve(`rgb(${r}, ${g}, ${b})`)
      } catch {
        resolve(null)
      }
    }

    img.onerror = () => resolve(null)
    img.src = imageUrl
  })
}
