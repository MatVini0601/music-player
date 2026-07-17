import { Sparkles } from 'lucide-react'

interface WhatsNewModalProps {
  version: string
  changes: string[]
  onClose: () => void
}

/** Shown once on the first launch after an update, listing that release's changes. */
export function WhatsNewModal({ version, changes, onClose }: WhatsNewModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-[26rem] rounded-lg border border-white/10 bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">What&apos;s new</h2>
            <p className="text-sm text-gray-400">Version {version}</p>
          </div>
        </div>

        <ul className="mt-4 flex max-h-80 flex-col gap-2 overflow-y-auto">
          {changes.map((change) => (
            <li key={change} className="flex gap-2 text-sm text-gray-300">
              <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
              {change}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
