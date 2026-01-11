import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['lib/**/*.test.ts', 'contents/**/*.test.ts'],
    exclude: ['node_modules', '.plasmo', 'build'],
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './'),
      '~lib': path.resolve(__dirname, './lib'),
      '~contents': path.resolve(__dirname, './contents'),
    },
  },
})
