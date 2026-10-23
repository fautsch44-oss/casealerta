import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(p, 'utf8');
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const src = walk('src').filter((f) => /\.(ts|tsx)$/.test(f));

describe('preflight de tienda', () => {
  it('llaves públicas con respaldo en código', () => {
    const rc = read('src/lib/purchases.ts');
    expect(rc).toMatch(/appl_[A-Za-z0-9]{20,}/);
    expect(rc).toMatch(/goog_[A-Za-z0-9]{20,}/);
    expect(read('src/lib/analytics.ts')).toMatch(/phc_[A-Za-z0-9]{20,}/);
    expect(read('src/lib/supabase.ts')).toMatch(/sb_publishable_|eyJ/);
  });
  it('sin llaves secretas en el cliente', () => {
    for (const f of src) expect(read(f), f).not.toMatch(/sk_live_|sk_test_|service_role|sb_secret_/);
  });
  it('sin textos de versión de prueba ni relleno visibles', () => {
    const s = read('src/i18n/strings.ts');
    expect(s).not.toMatch(/test version|versión de prueba|versión de la tienda|store version|not provided|Lorem/i);
  });
  it('sin rastreo entre apps', () => {
    expect(read('app.json')).not.toMatch(/NSUserTrackingUsageDescription/);
  });
  it('taxonomía del embudo presente en el código', () => {
    const all = src.map(read).join('\n');
    for (const ev of ['onboarding_step_viewed', 'permission_result', 'first_value_shown', 'paywall_viewed', 'plan_selected', 'purchase_completed', 'purchase_failed', 'error_shown', 'trial_started'])
      expect(all, ev).toContain(`'${ev}'`);
  });
  it('el paywall nunca se abre con replace', () => {
    for (const f of src) expect(read(f), f).not.toMatch(/replace\((\{ pathname: )?'\/paywall\/(example|plans)'/);
  });
});
