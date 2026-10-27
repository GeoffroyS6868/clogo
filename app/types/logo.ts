export type ShapeId = 'circle' | 'square' | 'triangle' | 'diamond' | 'petal' | 'bar' | 'arc' | 'star'
export type Layout = 'circle' | 'square'
export type Paint = 'fill' | 'stroke'

export interface Logo {
  shape: ShapeId
  layout: Layout
  circleCount: number
  gridSize: number
  spread: number
  size: number
  rotation: number
  twist: number
  paint: Paint
}
