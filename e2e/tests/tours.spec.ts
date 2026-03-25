import { test, expect, Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('test@vibeplanner.com')
  await page.getByLabel('Password').fill('V1b3Pl@nn3r!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/tours')
}

async function goToTours(page: Page) {
  await page.getByRole('link', { name: 'Tours' }).click()
  await expect(page).toHaveURL('/tours')
}

test('unauthenticated user is redirected to login when visiting /tours', async ({ page }) => {
  await page.goto('/tours')
  await expect(page).toHaveURL('/login')
})

test('authenticated user sees Tours nav link and tours page', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('link', { name: 'Tours' })).toBeVisible()
  await expect(page).toHaveURL('/tours')
  await expect(page.getByRole('button', { name: '+ New Tour' })).toBeVisible()
})

test('create a tour and verify it appears in the list', async ({ page }) => {
  await login(page)
  await goToTours(page)

  await page.getByRole('button', { name: '+ New Tour' }).click()
  await expect(page.getByRole('heading', { name: 'New Tour' })).toBeVisible()

  await page.getByLabel('Tour Number').fill('8001')
  await page.getByLabel('Vehicle Type').selectOption('SPRINTER_3_5T')
  await page.getByLabel('Max Volume (m³)').fill('14')
  await page.getByLabel('Max Weight (kg)').fill('3500')
  await page.getByLabel('Range (km)').fill('200')

  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('heading', { name: 'New Tour' })).not.toBeVisible()
  await expect(page.getByText('8001')).toBeVisible()
  await expect(page.getByText('Sprinter 3.5t')).toBeVisible()
})

test('edit a tour and verify the update in the list', async ({ page }) => {
  await login(page)
  await goToTours(page)

  // Create a tour to edit
  await page.getByRole('button', { name: '+ New Tour' }).click()
  await page.getByLabel('Tour Number').fill('8002')
  await page.getByLabel('Vehicle Type').selectOption('CARGO_BIKE')
  await page.getByLabel('Max Volume (m³)').fill('1.5')
  await page.getByLabel('Max Weight (kg)').fill('100')
  await page.getByLabel('Range (km)').fill('50')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('8002')).toBeVisible()

  // Edit it
  const row = page.locator('tr', { hasText: '8002' })
  await row.getByTitle('Edit').click()
  await expect(page.getByRole('heading', { name: 'Edit Tour' })).toBeVisible()

  await page.getByLabel('Vehicle Type').selectOption('BOX_TRUCK_7_5T')
  await page.getByLabel('Max Weight (kg)').fill('7500')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('heading', { name: 'Edit Tour' })).not.toBeVisible()
  await expect(page.getByText('Box Truck 7.5t')).toBeVisible()
})

test('delete a tour and verify it is removed from the list', async ({ page }) => {
  await login(page)
  await goToTours(page)

  // Create a tour to delete
  await page.getByRole('button', { name: '+ New Tour' }).click()
  await page.getByLabel('Tour Number').fill('8003')
  await page.getByLabel('Vehicle Type').selectOption('SPRINTER_5_5T')
  await page.getByLabel('Max Volume (m³)').fill('20')
  await page.getByLabel('Max Weight (kg)').fill('5500')
  await page.getByLabel('Range (km)').fill('300')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('8003')).toBeVisible()

  // Delete it
  const row = page.locator('tr', { hasText: '8003' })
  await row.getByTitle('Delete').click()
  await expect(page.getByText('Delete Tour 8003?')).toBeVisible()

  await page.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByText('Delete Tour 8003?')).not.toBeVisible()
  await expect(page.getByText('8003')).not.toBeVisible()
})

test('creating a tour with invalid tour number shows validation error', async ({ page }) => {
  await login(page)
  await goToTours(page)

  await page.getByRole('button', { name: '+ New Tour' }).click()
  await page.getByLabel('Tour Number').fill('AB')
  await page.getByLabel('Vehicle Type').selectOption('CARGO_BIKE')
  await page.getByLabel('Max Volume (m³)').fill('1')
  await page.getByLabel('Max Weight (kg)').fill('100')
  await page.getByLabel('Range (km)').fill('50')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('Tour number must be exactly 4 digits.')).toBeVisible()
  // Modal stays open
  await expect(page.getByRole('heading', { name: 'New Tour' })).toBeVisible()
})

test('cancel button closes the modal without saving', async ({ page }) => {
  await login(page)
  await goToTours(page)

  await page.getByRole('button', { name: '+ New Tour' }).click()
  await page.getByLabel('Tour Number').fill('8099')
  await page.getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByRole('heading', { name: 'New Tour' })).not.toBeVisible()
  await expect(page.getByText('8099')).not.toBeVisible()
})
