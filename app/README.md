# CaseAlerta — app nativa (iOS / Android)

React Native + Expo Router (SDK 58). Bundle `com.vargergroup.casealerta`. Lienzo: Claude Design "CaseAlerta — Pantallas v1".

## Pantallas
- `src/app/index.tsx` — splash C (ondas de bandera + sello) y ruta inicial.
- `src/app/onboarding/{language,receipt,alerts}.tsx` — O1–O3.
- `src/app/paywall/{example,plans}.tsx` — P1–P2 (RevenueCat; web y B2B cobran por Stripe).
- `src/app/(tabs)/{cases,settings}.tsx` — A1, A3.
- `src/app/case/[id].tsx` — A2 + festejo al aprobar (`src/components/Celebration.tsx`).

## Datos
Supabase `varger-core`, esquema `casealerta` (RLS por `owner_id`). Sesión anónima; el correo se liga después.
Estatus oficial vía Edge Function `casealerta-uscis-status` (YUNQUE). Explicaciones desde `status_explanations` (caché, nunca el modelo en caliente).

## Correr
```
npm install
cp .env.example .env   # llaves públicas; las de RevenueCat las pone FARO
npx expo start
```
Build en la nube: `npx eas-cli build --profile development --platform ios` (cuenta Expo `vargers-team`, Apple Team T8LHUXT5MR).

## Pendiente de otros agentes
- YUNQUE: webhook RevenueCat → `subscriptions`; cron `poll` + `casealerta-notify` ya existen.
- FARO: `extra.eas.projectId`, llaves RC en EAS secrets, íconos finales (sello sobre marino), envío a tiendas.
- V1 Boletín de visas: requiere tabla `visa_bulletin` (CIMIENTO) antes de construir la pantalla.
