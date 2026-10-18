import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PORT ?? 3917)
// Software WebGL so the 3D view also runs on CI machines without a GPU.
const gpuless = { launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } }

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  workers: 1,
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure' },
  webServer: { command: `npx next start -p ${port}`, url: `http://localhost:${port}`, reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...gpuless } },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...gpuless } },
  ],
})
