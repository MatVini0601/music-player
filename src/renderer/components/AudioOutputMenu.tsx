import { Check } from 'lucide-react'
import { useOutputDevices } from '../hooks/useOutputDevices'
import { MenuItem } from './MenuItem'

interface AudioOutputMenuProps {
  audioOutputId: string
  onChange: (deviceId: string) => void
  close: () => void
}

/** Output-device list for a PopoverMenu: System default plus every detected device. */
export function AudioOutputMenu({ audioOutputId, onChange, close }: AudioOutputMenuProps) {
  const outputDevices = useOutputDevices()

  const pick = (deviceId: string): void => {
    onChange(deviceId)
    close()
  }

  return (
    <div className="max-h-72 overflow-y-auto">
      <MenuItem onClick={() => pick('')}>
        <span className="flex items-center justify-between gap-2">
          System default
          {!audioOutputId && <Check size={14} className="flex-shrink-0 text-accent" />}
        </span>
      </MenuItem>
      {outputDevices.map((device) => (
        <MenuItem key={device.deviceId} onClick={() => pick(device.deviceId)}>
          <span className="flex items-center justify-between gap-2">
            <span className="truncate">{device.label}</span>
            {audioOutputId === device.deviceId && (
              <Check size={14} className="flex-shrink-0 text-accent" />
            )}
          </span>
        </MenuItem>
      ))}
    </div>
  )
}
