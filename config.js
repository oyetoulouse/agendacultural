/* ============================================================
   OYE TOULOUSE — Configuración
   Esto es lo único que hay que tocar para conectar la app.
   ============================================================ */
window.OYE_CONFIG = {
  // URL del Google Apps Script publicado (termina en /exec).
  // Vacía = la app usa los datos de ejemplo de /data y el formulario no envía nada.
  API_URL: "https://script.google.com/macros/s/AKfycbzYINceaj2xi4ESdGE8qmlQ7caWkbE04a89FfGCYXcz9jufHILEdRWCpXAsTAUScJ07/exec",

  // true = eventos de ejemplo "movidos" a la fecha de hoy para poder probar la app.
  // Ponlo en false cuando conectes el Google Sheet.
  DEMO_MODE: false,
  DEMO_ANCHOR: "2026-10-07", // fecha que en los datos de ejemplo cuenta como "hoy"

  // Cuántos días muestra la agenda
  DIAS_AGENDA: 31,

  // Redes y contacto del medio
  INSTAGRAM: "oyetoulouse",
  EMAIL: "",          // ej. "hola@oyetoulouse.fr"
  YOUTUBE: "https://www.youtube.com/@OyeToulouse",        // ej. "https://youtube.com/@oyetoulouse"

  // Dirección pública de la app: sale al pie de las stories (ej. "https://oyetoulouse.vercel.app")
  APP_URL: "https://agendacultural-three.vercel.app"
};
