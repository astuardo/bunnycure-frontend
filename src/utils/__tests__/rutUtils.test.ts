import { describe, it, expect } from 'vitest';
import {
  cleanRut,
  isValidRutDv,
  isValidRutFormat,
  formatRutWithDots,
  formatRutWithoutDots,
} from '../rutUtils';

describe('rutUtils (Módulo de Validación y Formato de RUT Chileno)', () => {
  describe('cleanRut', () => {
    it('debe limpiar puntos, guiones y espacios correctamente', () => {
      expect(cleanRut(' 18.664.589-8 ')).toBe('186645898');
      expect(cleanRut('11.111.111-k')).toBe('11111111K');
      expect(cleanRut(null)).toBe('');
      expect(cleanRut(undefined)).toBe('');
    });
  });

  describe('isValidRutDv', () => {
    it('debe validar RUTs válidos reales con dígito numérico', () => {
      expect(isValidRutDv('186645898')).toBe(true);
      expect(isValidRutDv('111111111')).toBe(true);
      expect(isValidRutDv('761920839')).toBe(true);
    });

    it('debe validar RUTs válidos terminados en K', () => {
      expect(isValidRutDv('11111112K')).toBe(true);
    });

    it('debe rechazar RUTs con dígito verificador erróneo', () => {
      expect(isValidRutDv('186645899')).toBe(false);
      expect(isValidRutDv('111111112')).toBe(false);
    });

    it('debe retornar false para strings demasiado cortos o inválidos', () => {
      expect(isValidRutDv('1')).toBe(false);
      expect(isValidRutDv('abc')).toBe(false);
    });
  });

  describe('isValidRutFormat', () => {
    it('debe validar formato correcto con o sin puntos', () => {
      expect(isValidRutFormat('18.664.589-8')).toBe(true);
      expect(isValidRutFormat('18664589-8')).toBe(true);
      expect(isValidRutFormat('186645898')).toBe(true);
    });

    it('debe rechazar formatos que no corresponden a RUT', () => {
      expect(isValidRutFormat('123')).toBe(false);
      expect(isValidRutFormat('18.664.589-XYZ')).toBe(false);
      expect(isValidRutFormat('')).toBe(false);
    });
  });

  describe('formatRutWithDots', () => {
    it('debe formatear a estándar visual con puntos y guión', () => {
      expect(formatRutWithDots('186645898')).toBe('18.664.589-8');
      expect(formatRutWithDots('11111111k')).toBe('11.111.111-K');
    });
  });

  describe('formatRutWithoutDots', () => {
    it('debe formatear sin puntos pero con guión', () => {
      expect(formatRutWithoutDots('18.664.589-8')).toBe('18664589-8');
      expect(formatRutWithoutDots('186645898')).toBe('18664589-8');
    });
  });
});
