import { describe, it, expect } from 'vitest';
import { stripSystemNoteBlocks } from '../appointmentUtils';

describe('stripSystemNoteBlocks (notas heredadas a la próxima cita)', () => {
  it('quita bloques de cancelación y conserva las notas de la clienta', () => {
    const notes = 'Diseño a mano alzada\n\n--- CANCELACIÓN ---\nCancelado por: Cliente\nMotivo: Urgencia';
    expect(stripSystemNoteBlocks(notes)).toBe('Diseño a mano alzada');
  });

  it('quita varios bloques de cancelación acumulados', () => {
    const notes = '--- CANCELACIÓN ---\nMotivo: Urgencia\n\n--- CANCELACIÓN ---\nCancelado por: Cliente\nMotivo: Motivo urgente';
    expect(stripSystemNoteBlocks(notes)).toBe('');
  });

  it('quita etiquetas de pago con GiftCard', () => {
    expect(stripSystemNoteBlocks('Alergia al acrílico\n[Pago con GiftCard GC-123: Manicure]')).toBe('Alergia al acrílico');
  });

  it('retorna vacío para notas nulas', () => {
    expect(stripSystemNoteBlocks(null)).toBe('');
    expect(stripSystemNoteBlocks(undefined)).toBe('');
  });
});
