import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { clerkPlugin, useAuth } from '@clerk/vue'
import App from '@/App.vue'
import ConfigError from '@/components/common/ConfigError.vue'
import { setTokenProvider, setUnauthorizedHandler } from '@/api/http'
import { createUnauthorizedHandler } from '@/lib/authRecovery'
import { createAppRouter } from '@/router'
import '@/style.css'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  createApp(ConfigError, {
    message: 'VITE_CLERK_PUBLISHABLE_KEY is not set. Add it to frontend/.env and restart.',
  }).mount('#app')
} else {
  const app = createApp(App)
  app.use(clerkPlugin, { publishableKey })
  app.use(createPinia())

  const auth = app.runWithContext(() => useAuth())
  const router = createAppRouter(auth)
  app.use(router)

  setTokenProvider(() => auth.getToken.value())
  setUnauthorizedHandler(createUnauthorizedHandler(auth, router))

  app.mount('#app')
}
