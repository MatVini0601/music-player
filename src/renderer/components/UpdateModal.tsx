import { Download, RefreshCw } from 'lucide-react'
import type { UpdateStatus } from '../hooks/useAppUpdates'

interface UpdateModalProps {
  status: UpdateStatus
  onDownload: () => void
  onInstall: () => void
  onClose: () => void
}

export function UpdateModal({ status, onDownload, onInstall, onClose }: UpdateModalProps) {
  if (status.phase !== 'available' && status.phase !== 'downloaded') return null

  const isDownloaded = status.phase === 'downloaded'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-96 rounded-lg border border-white/10 bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            {isDownloaded ? <RefreshCw size={18} /> : <Download size={18} />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              {isDownloaded ? 'Update ready' : 'Update available'}
            </h2>
            <p className="text-sm text-gray-400">Version {status.version}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-300">
          {isDownloaded
            ? 'The update has been downloaded. Restart the app to apply it.'
            : 'A new version is available. Do you want to download it now?'}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-1.5 text-sm text-gray-400 transition-colors hover:text-white"
          >
            Later
          </button>
          <button
            onClick={isDownloaded ? onInstall : onDownload}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            {isDownloaded ? 'Restart now' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  )
}
