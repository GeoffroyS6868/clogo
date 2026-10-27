export type ShapeId = 'circle' | 'square' | 'triangle' | 'diamond' | 'petal' | 'bar' | 'arc' | 'star'
export type Layout = 'circle' | 'grid' | 'triangle' | 'rays'
export type Paint = 'fill' | 'stroke'

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
}
