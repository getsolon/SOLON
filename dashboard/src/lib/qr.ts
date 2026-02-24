import QRCode from 'qrcode'

/**
 * Generate a QR code as an SVG string for the given text.
 * Uses error correction level L (sufficient for URLs).
 */
export function generateQRCodeSVG(text: string): string {
  // qrcode.toString with type 'svg' is synchronous when callback is omitted (returns string)
  let svg = ''
  QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'L',
    margin: 2,
    width: 200,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  }, (err: Error | null | undefined, str: string) => {
    if (!err) svg = str
  })
  return svg
}
