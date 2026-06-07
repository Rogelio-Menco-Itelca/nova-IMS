/** Configuración producción — ajustar antes del build o en CI/CD. */
export const environment = {
  production: true,
  /**
   * Vacío si nginx sirve frontend y API en el mismo dominio (/api, /socket.io, /location).
   * Si el API está en otro host: 'https://api.tudominio.gov.co'
   */
  apiUrl: '',
  googleMapsApiKey: 'REEMPLAZAR_CLAVE_GOOGLE_MAPS',
  publicShareBaseUrl: '',
};
