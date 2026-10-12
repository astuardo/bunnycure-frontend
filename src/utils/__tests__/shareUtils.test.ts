import { describe, it, expect } from 'vitest';
import { copyToClipboard, buildWhatsAppUrl } from '../shareUtils';

describe('shareUtils', () => {
  describe('buildWhatsAppUrl', () => {
    it('debe formatear números chilenos agregando el código de país 56', () => {
      const url = buildWhatsAppUrl('+56912345678', 'Hola');
      expect(url).toBe('https://wa.me/56912345678?text=Hola');
    });

    it('debe agregar 56 si el teléfono comienza en 9 y tiene 9 dígitos', () => {
      const url = buildWhatsAppUrl('987654321', 'Prueba');
      expect(url).toBe('https://wa.me/56987654321?text=Prueba');
    });

    it('debe generar enlace sin teléfono si no se pasa', () => {
      const url = buildWhatsAppUrl(undefined, 'Mensaje');
      expect(url).toBe('https://wa.me/?text=Mensaje');
    });
  });

  describe('copyToClipboard', () => {
    it('debe retornar false si el texto es vacío', async () => {
      const result = await copyToClipboard('');
      expect(result).toBe(false);
    });
  });
});
