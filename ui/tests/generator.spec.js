import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'

test.describe('Generator UI', () => {
  let electronApp

  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../out/main/index.js')],
      env: {
        NODE_ENV: 'development'
      }
    })
  })

  test.afterAll(async () => {
    await electronApp.close()
  })

  test('should load the app and show title', async () => {
    const window = await electronApp.firstWindow()
    await expect(window).toHaveTitle('Float Devtools App')
    await expect(window.locator('h1')).toHaveText('Next Gen Generator')
  })

  test('should list generators', async () => {
    const window = await electronApp.firstWindow()
    // Check if generators are listed
    await expect(window.getByText('electron-float')).toBeVisible()
    await expect(window.getByText('tron-mini')).toBeVisible()
    await expect(window.getByText('agent-rules')).toBeVisible()
    await expect(window.getByText('app-scaffold')).toBeVisible()
  })

  test('should select generator and show form', async () => {
    const window = await electronApp.firstWindow()
    
    // Click on electron-float generator
    await window.getByText('electron-float').click()
    
    // Check if form appears
    await expect(window.getByText('Configure electron-float')).toBeVisible()
    await expect(window.getByText('Application name')).toBeVisible()
    await expect(window.getByText('Destination path')).toBeVisible()
  })

  test('should handle start on boot setting', async () => {
    const window = await electronApp.firstWindow()
    
    const checkbox = window.locator('input[type="checkbox"]').first()
    await expect(checkbox).toBeVisible()
    
    // Toggle checkbox
    const isChecked = await checkbox.isChecked()
    await checkbox.click()
    await expect(checkbox).toBeChecked({ checked: !isChecked })
  })
})
