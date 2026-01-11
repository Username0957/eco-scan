export function getImageSizeInKB(base64: string): number {
  // Remove data URL prefix if present
  const base64Data = base64.split(",")[1] || base64
  // Each base64 character represents 6 bits, so 4 characters = 3 bytes
  const bytes = (base64Data.length * 3) / 4
  return Math.round(bytes / 1024)
}

export function validateImageSize(base64: string, maxSizeKB = 4096): boolean {
  return getImageSizeInKB(base64) <= maxSizeKB
}

// Extract MIME type from base64 data URL
export function getMimeType(base64: string): string {
  const match = base64.match(/^data:([^;]+);base64,/)
  return match ? match[1] : "image/jpeg"
}
