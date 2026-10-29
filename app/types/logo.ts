export type ShapeId = 'circle' | 'square' | 'polygon' | 'diamond' | 'star' | 'petal' | 'bar' | 'arc' | 'cross' | 'glyph'
export type Layout = 'circle' | 'grid' | 'triangle' | 'rays'
export type Paint = 'fill' | 'stroke'

export interface ShapeSlot {
  id: ShapeId
  // '#rrggbb', null = automatic (currentColor)
  color: string | null
  // Star branches, polygon sides, cross arms: only on those shapes
  count?: number
  // The character of a glyph shape: only on 'glyph'
  char?: string
}

// What a shape setting can change: everything but which shape it is
export type ShapeChanges = Partial<Omit<ShapeSlot, 'id'>>

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
  // Whole logo, on top of the automatic fit: above 1 the frame crops it
  scale: number
  paint: Paint
  corner: number
  smooth: boolean
  // '#rrggbb', null = transparent
  background: string | null
}

export interface Design {
  id: string
  logo: Logo
  // Date.now() at the time of saving
  savedAt: number
}
