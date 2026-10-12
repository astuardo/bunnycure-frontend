import { describe, it, expect } from 'vitest';
import { formatCurrencyCLP } from '../formatters';

describe('formatters (Módulo de Formateo de Moneda CLP)', () => {
  it('debe retornar "-" para valores nulos o indefinidos', () => {
    expect(formatCurrencyCLP(null)).toBe('-');
    expect(formatCurrencyCLP(undefined)).toBe('-');
    expect(formatCurrencyCLP(NaN)).toBe('-');
  });

  it('debe formatear valores enteros en pesos chilenos con separador de miles', () => {
    const formatted = formatCurrencyCLP(15000);
    expect(formatted).toContain('15.000');
    expect(formatted).toContain('$');
  });

  it('debe formatear cero correctamente', () => {
    const formatted = formatCurrencyCLP(0);
    expect(formatted).toContain('0');
    expect(formatted).toContain('$');
  });

  it('debe formatear números grandes con separadores de miles adecuados', () => {
    const formatted = formatCurrencyCLP(1250000);
    expect(formatted).toContain('1.250.000');
  });
});
