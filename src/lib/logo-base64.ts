import fs from 'fs'
import path from 'path'

let logoBase64Cache: string | null = null

export function getLogoBase64(): string {
  if (logoBase64Cache) {
    return logoBase64Cache
  }

  try {
    // Read the logo file from public directory
    const logoPath = path.join(process.cwd(), 'public', 'images', 'pairin-logo.png')
    const logoBuffer = fs.readFileSync(logoPath)
    const base64 = logoBuffer.toString('base64')
    logoBase64Cache = `data:image/png;base64,${base64}`
    return logoBase64Cache
  } catch (error) {
    console.error('Error reading logo file:', error)
    // Return a fallback empty image
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  }
}