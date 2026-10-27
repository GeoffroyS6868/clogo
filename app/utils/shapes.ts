interface Shape {
  label: string
  // Closed path in [-50, 50]², centred on the origin, pointing up
  d: string
  // Bounding circle from the origin, used to fit the logo in its frame
  radius: number
}

export const SHAPES: Record<ShapeId, Shape> = {
  circle: {
    label: 'Cercle',
    d: 'M0 -50 A50 50 0 1 1 0 50 A50 50 0 1 1 0 -50 Z',
    radius: 50
  },
  square: {
    label: 'Carré',
    d: 'M-50 -50 L50 -50 L50 50 L-50 50 Z',
    radius: Math.hypot(50, 50)
  },
  triangle: {
    label: 'Triangle',
    d: 'M0 -50 L43.3 25 L-43.3 25 Z',
    radius: 50
  },
  diamond: {
    label: 'Losange',
    d: 'M0 -50 L32 0 L0 50 L-32 0 Z',
    radius: 50
  },
  petal: {
    label: 'Pétale',
    // Two arcs of radius (50² + 28²) / (2 · 28), for a max width of 56
    d: 'M0 -50 A58.64 58.64 0 0 1 0 50 A58.64 58.64 0 0 1 0 -50 Z',
    radius: 50
  },
  bar: {
    label: 'Barre',
    d: 'M-12 -50 L12 -50 L12 50 L-12 50 Z',
    radius: Math.hypot(12, 50)
  },
  arc: {
    label: 'Arc',
    // Upper half ring, shifted down by 25 so its box is centred
    d: 'M-50 25 A50 50 0 0 1 50 25 L26 25 A26 26 0 0 0 -26 25 Z',
    radius: Math.hypot(50, 25)
  },
  star: {
    label: 'Étoile',
    d: 'M0 -50 L9.9 -9.9 L50 0 L9.9 9.9 L0 50 L-9.9 9.9 L-50 0 L-9.9 -9.9 Z',
    radius: 50
  }
}

export const SHAPE_IDS = Object.keys(SHAPES) as ShapeId[]
