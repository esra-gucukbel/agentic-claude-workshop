import { test, expect } from '@playwright/test'

test('landing page loads with Vibe Planner logo', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Vibe Planner' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible()
})

test('login flow with valid credentials succeeds', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Get Started' }).click()

  await expect(page).toHaveURL('/login')

  await page.getByLabel('Email').fill('test@vibeplanner.com')
  await page.getByLabel('Password').fill('V1b3Pl@nn3r!')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByText("You're logged in.")).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()

  const token = await page.evaluate(() => localStorage.getItem('token'))
  expect(token).toBeTruthy()
})

test('logout clears session and returns to landing page', async ({ page }) => {
  // Log in first
  await page.goto('/login')
  await page.getByLabel('Email').fill('test@vibeplanner.com')
  await page.getByLabel('Password').fill('V1b3Pl@nn3r!')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()

  // Now log out
  await page.getByRole('button', { name: 'Log out' }).click()

  await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log out' })).not.toBeVisible()

  const token = await page.evaluate(() => localStorage.getItem('token'))
  expect(token).toBeNull()
})

test('login flow with wrong credentials shows error', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('Email').fill('test@vibeplanner.com')
  await page.getByLabel('Password').fill('wrongpassword')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByText('Invalid email or password.')).toBeVisible()
  await expect(page).toHaveURL('/login')
})
