const PNG_SIZE = 1024

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadSvg(logo: Logo) {
  save(new Blob([toSvg(logo)], { type: 'image/svg+xml' }), 'clogo.svg')
}

export async function downloadPng(logo: Logo) {
  const url = URL.createObjectURL(new Blob([toSvg(logo)], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = PNG_SIZE
    canvas.height = PNG_SIZE
    canvas.getContext('2d')?.drawImage(img, 0, 0, PNG_SIZE, PNG_SIZE)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (blob) save(blob, 'clogo.png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function copySvg(logo: Logo) {
  return navigator.clipboard.writeText(toSvg(logo))
}
