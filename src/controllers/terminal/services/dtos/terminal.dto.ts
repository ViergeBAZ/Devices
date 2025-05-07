import type { ETerminalLocation } from '@app/interfaces/terminal.interface'

type TFilter = 'warehouse' | 'franchise' | 'commerce'

/* requests */
export interface IGetTerminalsQuery {
  filter?: TFilter
  start?: number
  end?: number
}

export interface IGetCountTerminal {
  filter?: TFilter
}

export interface IGetSearchTerminals {
  field?: string
  value?: string
  limit?: number
  location?: ETerminalLocation
}

export interface IPostTerminal {
  /* required fields */
  name: string
  serialNumber: string
  warehouseManager: string
  systemChargeResponsible: string
  arrivalTrackingGuide: string
  parcelDistributor: string
  arrivalDate: Date
  /* non-required fields */
  chipSerialNumber?: string
  chipTwoSerialNumber?: string
  imeiTerminal?: string
  imeiTwoTerminal?: string
}

// TODO: pasar interfaces a dtos
