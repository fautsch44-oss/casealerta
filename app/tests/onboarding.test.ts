import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { next, prev, resume, ROUTE, skipTarget, STEPS } from '../src/lib/onboarding';

describe('máquina de estados del onboarding', () => {
  it('orden: intro → idioma → recibo → alertas', () => {
    expect([...STEPS]).toEqual(['intro', 'language', 'receipt', 'alerts']);
    expect(next('intro')).toBe('language');
    expect(next('alerts')).toBeNull();
    expect(prev('receipt')).toBe('language');
    expect(prev('intro')).toBeNull();
  });
  it('cada paso tiene su pantalla en src/app', () => {
    for (const s of STEPS) expect(existsSync(`src/app${ROUTE[s]}.tsx`)).toBe(true);
    for (const r of ['paywall/example', 'paywall/plans', 'paywall/thanks', '(tabs)/cases', '(tabs)/settings']) expect(existsSync(`src/app/${r}.tsx`)).toBe(true);
  });
  it('reanudar siempre cae dentro del camino', () => {
    expect(resume(null, false)).toBe('intro');
    expect(resume('paso-retirado', false)).toBe('intro');
    expect(resume('receipt', false)).toBe('receipt');
    expect(resume('alerts', true)).toBe('alerts');
    expect(resume('alerts', false)).toBe('receipt');
  });
  it('Saltar no brinca el primer valor (recibo)', () => {
    expect(skipTarget('intro')).toBe('language');
    expect(skipTarget('language')).toBe('receipt');
    expect(skipTarget('receipt')).toBe('receipt');
  });
});
