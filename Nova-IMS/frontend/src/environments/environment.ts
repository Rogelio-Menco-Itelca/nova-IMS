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
};
