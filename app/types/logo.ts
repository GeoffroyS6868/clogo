export type ShapeId = 'circle' | 'square' | 'triangle' | 'diamond' | 'petal' | 'bar' | 'arc' | 'star'
export type Layout = 'circle' | 'grid' | 'triangle' | 'rays'
export type Paint = 'fill' | 'stroke'
export type Filter = 'none' | 'pixel' | 'hex'

export interface ShapeSlot {
  id: ShapeId
  // '#rrggbb', null = automatic (currentColor)
  color: string | null
}

export interface Logo {
  shapes: ShapeSlot[]
  layout: Layout
  circleCount: number
  gridSize: number
  triangleRows: number
  rayCount: number
  rayLength: number
  spread: number
  size: number
  rotation: number
  twist: number
  paint: Paint
  corner: number
  smooth: boolean
  // '#rrggbb', null = transparent
  background: string | null
  filter: Filter
  // Cells across the frame
  cells: number
  // Space between cells, as a fraction of a cell
  gap: number
}

export interface Design {
  id: string
  logo: Logo
  // Date.now() at the time of saving
  savedAt: number
}
