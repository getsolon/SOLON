import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'

export default defineConfig({
  integrations: [tailwind({ configFile: './tailwind.config.mjs' })],
  site: 'https://solon.dev',
})
