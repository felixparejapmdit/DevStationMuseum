import { expect, test, type Page } from '@playwright/test'

type MuseumHook = {
  teleport: (x: number, z: number, yaw?: number, pitch?: number) => void
  room: (i: number) => void
  focus: (id: string) => Promise<void>
  info: () => { location: { zone: string; roomIndex: number | null }; focused: string | null; rooms: number }
}

const museum = (page: Page) => ({
  info: () => page.evaluate(() => (window as unknown as { __museum: MuseumHook }).__museum.info()),
  focus: (id: string) => page.evaluate((i) => (window as unknown as { __museum: MuseumHook }).__museum.focus(i), id),
})

async function enter(page: Page, path = '/') {
  await page.goto(path)
  const button = page.getByRole('button', { name: /Enter (the museum|at this work)/ })
  await expect(button).toBeEnabled({ timeout: 60_000 })
  await button.click()
  await expect(page.locator('canvas')).toBeVisible()
}

test('enters the museum and shows the controls', async ({ page }) => {
  await enter(page)
  await expect(page.getByRole('toolbar', { name: 'Museum controls' })).toBeVisible()
  expect((await museum(page).info()).location.zone).toBe('courtyard')
})

test('search opens a work and updates the URL', async ({ page }) => {
  await enter(page)
  await page.keyboard.press('Control+k')
  await page.getByPlaceholder(/Search works/).fill('pulseboard')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: /PulseBoard details/ })).toBeVisible({ timeout: 20_000 })
  await expect(page).toHaveURL(/\/museum\/[^/]+\/pulseboard$/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: /PulseBoard details/ })).toBeHidden()
})

test('deep link lands on the work', async ({ page }) => {
  await enter(page, '/museum/construction-and-field/rayon-workspace')
  await expect(page.getByRole('dialog', { name: /Rayon Workspace details/ })).toBeVisible({ timeout: 20_000 })
  expect((await museum(page).info()).location.zone).toBe('room')
})

test('back button closes a work without leaving the museum', async ({ page }) => {
  await enter(page)
  await museum(page).focus('buildflow')
  await expect(page).toHaveURL(/buildflow$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/museum\/construction-and-field$/)
  expect((await museum(page).info()).focused).toBeNull()
})

test('2D collection lists every work', async ({ page }) => {
  await page.goto('/projects')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('works')
  await page.getByRole('link', { name: /Kapilya Directory/ }).first().click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kapilya Directory')
})
