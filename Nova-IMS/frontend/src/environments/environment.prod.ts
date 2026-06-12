/** Configuración producción — ajustar antes del build o en CI/CD. */
export const environment = {
  production: true,
  /**
   * Vacío si nginx sirve frontend y API en el mismo dominio (/api, /socket.io, /location).
   * Si el API está en otro host: 'https://api.tudominio.gov.co'
   */
  apiUrl: '',
  /** Vacío: se obtiene en runtime desde GET /api/config/public (backend/.env). */
  googleMapsApiKey: '',
  publicShareBaseUrl: '',
  powerBiEmbedUrl:
    'https://app.powerbi.com/reportEmbed?reportId=aeee2cb9-c712-43fe-a1de-951b83b311d4&autoAuth=true&ctid=7523edfc-25ac-4863-9fb0-bb3e9448ed87&actionBarEnabled=true&reportCopilotInEmbed=true',
};
