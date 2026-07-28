import type { CapacitorConfig } from '@capacitor/cli'

/**
 * PescaPlus es una app con servidor (rutas API, base de datos, Stripe, auth
 * por cookies) — no se puede exportar como sitio estático sin perder todo eso
 * (el panel de admin, las reservas, "mi cuenta"...). Por eso el shell nativo
 * carga la web en producción dentro de su propio WebView (server.url) en vez
 * de empaquetar un build estático: la app y la web comparten exactamente el
 * mismo código y los mismos despliegues, sin mantener dos versiones.
 *
 * `www/` casi no se usa en tiempo de ejecución — existe porque la CLI de
 * Capacitor exige que webDir tenga contenido.
 */
const config: CapacitorConfig = {
  appId: 'es.pescaplus.app',
  appName: 'PescaPlus',
  webDir: 'www',
  server: {
    url: 'https://pescaplus.es',
    // La web ya sirve todo por HTTPS; sin esto Capacitor podría intentar
    // cargar recursos mixtos por http:// en algunos WebView de Android.
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    backgroundColor: '#ffffff',
  },
  ios: {
    backgroundColor: '#ffffff',
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#ffffff',
      showSpinner: false,
      launchAutoHide: true,
      launchFadeOutDuration: 200,
    },
  },
}

export default config
