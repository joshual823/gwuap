// Client-side image resizing, so nobody has to shrink a photo themselves
// before uploading it. A phone photo is 3-8MB; a 512px avatar is ~50KB.
//
// Runs entirely in the browser: the big file never leaves the device, so
// this also makes uploads fast on a phone connection.

export const AVATAR_SIZE = 512

/** Refuse to even decode something absurd — that would just hang a phone. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024

/** Matches --card, so a transparent PNG doesn't come out on white. */
const BACKDROP = '#12161B'

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap honours EXIF orientation, so photos taken sideways
  // don't come out rotated.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    } catch {
      // fall through to the <img> path
    }
  }
  return await new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unsupported image')) }
    img.src = url
  })
}

/**
 * Centre-crop to a square and scale down to `size`, returning a JPEG.
 * JPEG rather than WebP because every browser encodes it and the
 * difference at 512px is a few kilobytes.
 */
export async function squareResize(file: File, size = AVATAR_SIZE): Promise<Blob> {
  const source = await decode(file)
  const width = 'width' in source ? source.width : 0
  const height = 'height' in source ? source.height : 0
  if (!width || !height) throw new Error('unsupported image')

  const side = Math.min(width, height)
  const sx = (width - side) / 2
  const sy = (height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')

  ctx.fillStyle = BACKDROP
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(source as CanvasImageSource, sx, sy, side, side, 0, 0, size, size)
  if ('close' in source) source.close()

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) throw new Error('could not encode image')
  return blob
}
