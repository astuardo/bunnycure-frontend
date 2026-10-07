import { test, expect } from '@playwright/test';

test.describe('Flujo de Autenticación y Rutas Protegidas', () => {

  test('redirige a /login cuando un usuario no autenticado intenta acceder a /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    // Debe redirigir automáticamente a la pantalla de login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
  });

  test('renderiza correctamente el formulario de login con la identidad visual BunnyCure', async ({ page }) => {
    await page.goto('/login');

    // Verificar branding con selector por rol accesible (playwright-skill golden rule)
    await expect(page.getByRole('heading', { name: /bunnycure/i })).toBeVisible();

    // Verificar campos del formulario accesibles
    const usernameInput = page.getByPlaceholder(/ingresa tu usuario/i);
    const passwordInput = page.getByPlaceholder(/ingresa tu contraseña/i);
    const submitButton = page.getByRole('button', { name: /iniciar sesión/i });

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('muestra errores de validación si se envía el formulario vacío', async ({ page }) => {
    await page.goto('/login');

    const submitButton = page.getByRole('button', { name: /iniciar sesión/i });
    await submitButton.click();

    // Validar mensajes de feedback del schema Yup
    await expect(page.getByText(/el usuario es requerido/i)).toBeVisible();
    await expect(page.getByText(/la contraseña es requerida/i)).toBeVisible();
  });

  test('muestra feedback de error cuando las credenciales son incorrectas', async ({ page }) => {
    // Mock de respuesta de fallo de autenticación de la API
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Credenciales inválidas' }),
      });
    });

    await page.goto('/login');

    await page.getByPlaceholder(/ingresa tu usuario/i).fill('usuario_inexistente');
    await page.getByPlaceholder(/ingresa tu contraseña/i).fill('clave123');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Debe mostrar la alerta de error
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
