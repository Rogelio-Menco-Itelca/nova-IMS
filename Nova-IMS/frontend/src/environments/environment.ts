/** Configuración desarrollo local (ng serve). */
export const environment = {
  production: false,
  /** Vacío = mismo origen + proxy (localhost:4200 → backend). */
  apiUrl: '',
  googleMapsApiKey: 'AIzaSyAWjEPbhHEY7h7CuO8RSdoZ8F7_kNxY464',
  /**
   * Respaldo dev si backend/.env aún no tiene PUBLIC_URL/NGROK_URL.
   * Deje vacío cuando el backend ya genere la URL https correcta.
   */
  publicShareBaseUrl: '',
  /** Embed fijo de Power BI (sin entrada de usuario). */
  powerBiEmbedUrl:
    'https://app.powerbi.com/reportEmbed?reportId=aeee2cb9-c712-43fe-a1de-951b83b311d4&autoAuth=true&ctid=7523edfc-25ac-4863-9fb0-bb3e9448ed87&actionBarEnabled=true&reportCopilotInEmbed=true',
};
