import { describe, it, expect, vi } from 'vitest'
import { normalizeCaCert } from '@/lib/db-ca'

// Certificado autofirmado de usar y tirar, solo para probar el normalizador. No
// sirve para conectarse a nada, y da igual que caduque: leerlo no valida fechas.
const PEM = [
  '-----BEGIN CERTIFICATE-----',
  'MIIDGTCCAgGgAwIBAgIUdTIasfcyZLZ11hdbFRkrZYv4JYIwDQYJKoZIhvcNAQEL',
  'BQAwHDEaMBgGA1UEAwwRUGVzY2FQbHVzIFRlc3QgQ0EwHhcNMjYwODA0MDgwODUy',
  'WhcNMzYwODAxMDgwODUyWjAcMRowGAYDVQQDDBFQZXNjYVBsdXMgVGVzdCBDQTCC',
  'ASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALdXMYA2cuLPQ0xqodQGyAbX',
  'w9exebe6LWLd8NlDVH9diaqjSDoMcciMSiab7F3ZhvTO4H3fwStEvYOp15uRy/IU',
  'UIxMwVvoV0v2NLKzYcddkyx62vFseWb5XfvYGozs1ikQ724KZbizpv0OseSCH296',
  '79IeoIKUlcRjEyBbyy+S0dnjaUjnDKkAw03g0q2+KjsfzUHJYW1mLzlIrdayZ5PZ',
  'ROnFP/r7WCJz+QZVFAzVYb0gKoKwkiSh/ufdY/fVk7S2DspHXc9TOj+r1weXq0qo',
  'CRi/LZ9f8HLS4opL8cMHRuzbZbtZojdeyaxEgjAI6CZCM3msBCwJMPFkY5nKOf0C',
  'AwEAAaNTMFEwHQYDVR0OBBYEFFB8Mmthcj/Z6K0HYg3lvumRILJlMB8GA1UdIwQY',
  'MBaAFFB8Mmthcj/Z6K0HYg3lvumRILJlMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZI',
  'hvcNAQELBQADggEBAJllDxJs/FNXQVmnpXgxmBtS3Cnt1p7RnCUQWFqdcIeKkP4/',
  '/M80KtyKhnUd9VZ8L3YV5r57tl5AYG2/g6bi6nAIPBKj6C192TKRZGrX/+AwN9Id',
  'U5akXH4AwWh9SxGM5XKsf1kOBAoTo+YkPBvBN9gwSdaayC6eC+ZGG9k+ZVOyF618',
  'Flrr5v6fGCFZ2FnuDKHW10eiN/lgH9RFS1j5UBo7I/sN6KlXN8gx9j4pwXrVwftC',
  'Y2lHf0AnBq45ftGU9Fwj662yd4vqrsAcOm/ko4HaMrjnCD2FtAd8I/udmXgEqQAf',
  'D8xUSZ/3z5t/Wm287BUOwKDQkNWL3AMZQc5at4E=',
  '-----END CERTIFICATE-----',
].join('\n')

/** El PEM tal y como se guarda en un `.env`: una sola línea con «\n» literales. */
const CON_BARRAS = PEM.split('\n').join(String.raw`\n`)

/**
 * Lo que el parser de Dockerfile hace con ese valor: se come la barra invertida
 * y deja la «n» pegada al base64. Comprobado en el servidor —
 * `ENV X=inicio\nfinal` acaba valiendo «inicionfinal».
 */
const DESTROZADO = CON_BARRAS.split(String.raw`\n`).join('n')

describe('normalizeCaCert', () => {
  it('deja pasar un PEM que ya trae saltos de línea reales', () => {
    expect(normalizeCaCert(PEM)).toBe(PEM)
  })

  it('convierte los «\\n» literales de un .env en saltos reales', () => {
    expect(normalizeCaCert(CON_BARRAS)).toBe(PEM)
  })

  it('reconstruye el PEM que ha destrozado el parser de Dockerfile', () => {
    // Este es exactamente el caso que tumbó el despliegue en Coolify.
    expect(DESTROZADO).not.toContain('\n')
    expect(normalizeCaCert(DESTROZADO)).toBe(PEM)
  })

  it('acepta el PEM entero en base64, la forma a prueba de parsers', () => {
    expect(normalizeCaCert(Buffer.from(PEM).toString('base64'))).toBe(PEM)
  })

  it('no se inventa un certificado cuando el valor no lo es', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(
      normalizeCaCert('-----BEGIN CERTIFICATE-----nAAAA-----END CERTIFICATE-----'),
    ).toBeUndefined()
    expect(normalizeCaCert('cualquier cosa')).toBeUndefined()
    expect(aviso).toHaveBeenCalled()
    aviso.mockRestore()
  })

  it('trata la variable vacía o ausente como «sin CA», y sin avisar', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(normalizeCaCert(undefined)).toBeUndefined()
    expect(normalizeCaCert('   ')).toBeUndefined()
    expect(aviso).not.toHaveBeenCalled()
    aviso.mockRestore()
  })
})
