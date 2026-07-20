import { useLayoutEffect, useRef, useState } from 'react'

interface MarqueeTextProps {
  text: string
  className?: string
}

/** Plain truncated text, but scrolls continuously (pausing on hover) once the text is wider
 *  than its container — so a long title still becomes fully readable. Remeasures on text or
 *  container width changes. */
export function MarqueeText({ text, className }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useLayoutEffect(() => {
    const container = containerRef.current
    const textEl = textRef.current
    if (!container || !textEl) return

    const check = (): void => setIsOverflowing(textEl.scrollWidth > container.clientWidth)
    check()

    const observer = new ResizeObserver(check)
    observer.observe(container)
    return () => observer.disconnect()
  }, [text])

  return (
    <div ref={containerRef} className={`overflow-hidden ${className ?? ''}`}>
      <div
        className={
          isOverflowing
            ? 'flex w-max animate-marquee gap-12 hover:[animation-play-state:paused]'
            : 'truncate'
        }
      >
        <span ref={textRef}>{text}</span>
        {isOverflowing && <span aria-hidden="true">{text}</span>}
      </div>
    </div>
  )
}
