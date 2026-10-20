// Iconografía del lienzo TRAZO aprobado por Juan (A1 y A2): ícono por tipo de caso, barra de 5 pasos,
// línea de pasos con íconos, anillo de días, burbuja "Te lo explico" y "Qué sigue" en tarjetas con ícono.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, fonts, shadow } from '../theme/tokens';
import { Seal } from './ui';

type Lang = 'es' | 'en';

// ── Íconos (trazo 2px, mismos paths del lienzo) ──────────────────────────────────────────────
const P = ({ d }: { d: string }) => <Path d={d} />;
export function Icon({ name, size = 24, color = colors.blue, sw = 2 }: { name: IconName; size?: number; color?: string; sw?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </Svg>
  );
}
export type IconName = 'home' | 'family' | 'briefcase' | 'plane' | 'flag' | 'doc' | 'inbox' | 'finger' | 'review' | 'evidence' | 'chat' | 'card' | 'check' | 'mail' | 'folder' | 'send' | 'clock' | 'bell' | 'x' | 'shield' | 'calendar';
const ICONS: Record<IconName, React.ReactNode> = {
  home: <><P d="M3 11l9-7 9 7" /><P d="M5 10v10h14V10" /><P d="M10 20v-6h4v6" /></>,
  family: <><Circle cx={9} cy={8} r={3} /><P d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><Circle cx={17} cy={9} r={2.5} /><P d="M15.5 14.2c3 .3 5.5 2.6 5.5 5.8" /></>,
  briefcase: <><Rect x={3} y={7} width={18} height={13} rx={2} /><P d="M9 7V5h6v2" /><P d="M3 12h18" /></>,
  plane: <P d="M2 16l20-7-20-7 4 7-4 7zM6 9h8" />,
  flag: <><P d="M5 21V4" /><P d="M5 4h12l-2 4 2 4H5" /></>,
  doc: <><P d="M6 3h9l4 4v14H6z" /><P d="M9 12h7M9 16h5" /></>,
  inbox: <><P d="M4 13l2-8h12l2 8" /><P d="M4 13v6h16v-6h-5l-1 2h-4l-1-2z" /></>,
  finger: <><P d="M12 11v4" /><P d="M8 12a4 4 0 0 1 8 0v3" /><P d="M5 12a7 7 0 0 1 14 0v2" /><P d="M10 20c.5-1 1-2.5 1-4" /></>,
  review: <><Circle cx={11} cy={11} r={6} /><P d="M20 20l-4.5-4.5" /></>,
  evidence: <><P d="M4 4h12l4 4v12H4z" /><P d="M12 9v5M12 17h.01" /></>,
  chat: <P d="M4 5h16v11H9l-5 4z" />,
  card: <><Rect x={3} y={5} width={18} height={14} rx={2} /><Circle cx={9} cy={11} r={2} /><P d="M14 10h4M14 13h3" /></>,
  check: <P d="M5 12l5 5 9-10" />,
  mail: <><Rect x={3} y={5} width={18} height={14} rx={2} /><P d="M3 7l9 6 9-6" /></>,
  folder: <P d="M3 6h6l2 2h10v11H3z" />,
  send: <><P d="M22 2L11 13" /><P d="M22 2l-7 20-4-9-9-4z" /></>,
  clock: <><Circle cx={12} cy={12} r={9} /><P d="M12 7v5l3 2" /></>,
  bell: <><P d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><P d="M10 20a2 2 0 0 0 4 0" /></>,
  x: <><Circle cx={12} cy={12} r={9} /><P d="M9 9l6 6M15 9l-6 6" /></>,
  shield: <><P d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /><P d="M8.5 12l2.5 2.5 4.5-5" /></>,
  calendar: <><Rect x={3} y={5} width={18} height={16} rx={2} /><P d="M3 10h18M8 3v4M16 3v4" /></>,
};

// ── Tipo de caso → ícono y nombre corto ─────────────────────────────────────────────────────
export function formIcon(form: string | null | undefined): IconName {
  const f = (form ?? '').toUpperCase().replace(/\s/g, '');
  if (/I-?485|I-?90|I-?751|I-?829/.test(f)) return 'home';
  if (/I-?130|I-?129F|I-?730|I-?600/.test(f)) return 'family';
  if (/I-?765|I-?140|I-?129|I-?821/.test(f)) return 'briefcase';
  if (/I-?131/.test(f)) return 'plane';
  if (/N-?400|N-?600/.test(f)) return 'flag';
  return 'doc';
}

// ── Recorrido: 5 pasos ──────────────────────────────────────────────────────────────────────
export type Journey = { current: number; action: boolean; denied: boolean; labels: string[]; icons: IconName[] };
export function journeyFor(statusText: string | null | undefined, form: string | null | undefined, lang: Lang): Journey {
  const s = (statusText ?? '').toLowerCase();
  let current = 0, action = false, denied = false;
  if (!s) current = 0;
  else if (/denied|rejected|terminated|withdrawal/.test(s)) { current = 4; denied = true; }
  else if (/approved|card was (produced|mailed|delivered|picked)|new card|oath|welcomed|document was mailed|delivered/.test(s)) current = 4;
  else if (/interview/.test(s)) current = 3;
  else if (/evidence|request for|intent to deny|rfe/.test(s)) { current = 2; action = true; }
  else if (/fingerprint|biometric/.test(s)) current = 1;
  else if (/received|fee was|accepted/.test(s) && !/review/.test(s)) current = 0;
  else current = 2;
  const card = formIcon(form) === 'home';
  const es = lang === 'es';
  const labels = [es ? 'Recibido' : 'Received', es ? 'Huellas' : 'Biometrics', action ? (es ? 'Pruebas' : 'Evidence') : (es ? 'Revisión' : 'Review'), es ? 'Entrevista' : 'Interview', denied ? (es ? 'Decisión' : 'Decision') : card ? (es ? 'Tarjeta' : 'Card') : (es ? 'Aprobado' : 'Approved')];
  const icons: IconName[] = ['inbox', 'finger', action ? 'evidence' : 'review', 'chat', denied ? 'x' : card ? 'card' : 'check'];
  return { current, action, denied, labels, icons };
}

/** A1: barra de 5 segmentos (azul hecho, rojo si piden algo, verde si aprobado). */
export function Segments({ j }: { j: Journey }) {
  const done = j.current === 4 && !j.denied;
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        let bg: string = colors.line;
        if (done) bg = colors.green;
        else if (i < j.current) bg = colors.blue;
        else if (i === j.current) bg = j.action || j.denied ? colors.red : colors.gold;
        return <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: bg }} />;
      })}
    </View>
  );
}

/** A2: línea de pasos con íconos sobre el encabezado azul. */
export function Stepper({ j }: { j: Journey }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {j.labels.map((label, i) => {
        const past = i < j.current, cur = i === j.current, future = i > j.current;
        const curColor = j.action || j.denied ? colors.red : j.current === 4 ? colors.green : colors.gold;
        return (
          <React.Fragment key={i}>
            {i > 0 && <View style={{ flex: 1, height: 3, marginTop: 19, backgroundColor: i <= j.current ? colors.onDark : 'rgba(255,255,255,0.35)' }} />}
            <View style={{ width: 58, alignItems: 'center', gap: 6, opacity: future ? 0.55 : 1 }}>
              <View style={[styles.stepDot, cur && { width: 48, height: 48, borderRadius: 24, marginTop: -4, backgroundColor: curColor, borderWidth: 3, borderColor: colors.onDark }, future && { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.onDark, borderStyle: 'dashed' }]}>
                <Icon name={j.icons[i]} size={cur ? 22 : 20} color={cur || future ? colors.onDark : colors.blue} sw={2.2} />
              </View>
              <Text style={{ fontFamily: cur ? fonts.black : fonts.bold, fontSize: 10, color: cur ? '#FFE7B0' : colors.onDark, textAlign: 'center' }} numberOfLines={1}>{label}</Text>
              {past && null}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

/** Anillo de días (respuesta pendiente o días en este estatus contra el rango típico). */
export function DaysRing({ days, total, color, caption }: { days: number; total: number | null; color: string; caption: string }) {
  const r = 34, c = 2 * Math.PI * r;
  const frac = total ? Math.max(0.04, Math.min(1, days / total)) : 0.75;
  return (
    <View style={[styles.ringBox, shadow.card]}>
      <View style={{ width: 82, height: 82, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={82} height={82} style={StyleSheet.absoluteFill}>
          <Circle cx={41} cy={41} r={r} stroke={colors.line} strokeWidth={9} fill="none" />
          <Circle cx={41} cy={41} r={r} stroke={color} strokeWidth={9} fill="none" strokeDasharray={`${c * frac} ${c}`} strokeLinecap="round" transform="rotate(-90 41 41)" />
        </Svg>
        <Text style={{ fontFamily: fonts.black, fontSize: 24, color, lineHeight: 26 }}>{days}</Text>
        <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: colors.muted }}>{caption.split('|')[0]}</Text>
      </View>
      <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.ink, textAlign: 'center' }}>{caption.split('|')[1]}</Text>
    </View>
  );
}

/** Burbuja del sello: "Te lo explico". */
export function Bubble({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <Seal size={32} border={2} />
        <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: colors.muted }}>✦ {label}</Text>
      </View>
      <View style={styles.bubble}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.ink }}>{text}</Text></View>
    </View>
  );
}

/** "Qué sigue" en tarjetas con ícono (máx. 3). */
export function nextIcon(text: string): { icon: IconName; fg: string; bg: string } {
  const s = text.toLowerCase();
  if (/correo|carta|aviso|notice|mail|letter/.test(s)) return { icon: 'mail', fg: colors.blue, bg: '#E6EEFA' };
  if (/huella|biom/.test(s)) return { icon: 'finger', fg: colors.blue, bg: '#E6EEFA' };
  if (/document|paquete|papel|junta|gather|upload|sube/.test(s)) return { icon: 'folder', fg: colors.amber, bg: colors.goldSoft };
  if (/env[ií]a|responde|answer|send|paga|pay/.test(s)) return { icon: 'send', fg: colors.green, bg: colors.greenSoft };
  if (/direcci|address/.test(s)) return { icon: 'home', fg: colors.amber, bg: colors.goldSoft };
  if (/entrevista|interview|cita|appointment/.test(s)) return { icon: 'chat', fg: colors.blue, bg: '#E6EEFA' };
  if (/espera|wait|nada|nothing|no tienes/.test(s)) return { icon: 'clock', fg: colors.amber, bg: colors.goldSoft };
  if (/tarjeta|card/.test(s)) return { icon: 'card', fg: colors.green, bg: colors.greenSoft };
  return { icon: 'check', fg: colors.green, bg: colors.greenSoft };
}
export function NextTiles({ steps }: { steps: string[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {steps.slice(0, 3).map((s, i) => {
        const n = nextIcon(s);
        return (
          <View key={i} style={[styles.tile, shadow.card]}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: n.bg, alignItems: 'center', justifyContent: 'center' }}><Icon name={n.icon} color={n.fg} /></View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: colors.ink, textAlign: 'center' }} numberOfLines={4}>{s}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Ícono grande del tipo de caso para la tarjeta de A1 (con "!" si piden algo). */
export function FormTile({ form, tone, alert }: { form: string | null | undefined; tone: { fg: string; bg: string }; alert?: boolean }) {
  return (
    <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={formIcon(form)} size={28} color={tone.fg} />
      {alert && <View style={styles.bang}><Text style={{ color: colors.onDark, fontFamily: fonts.black, fontSize: 12 }}>!</Text></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  stepDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.onDark, alignItems: 'center', justifyContent: 'center' },
  ringBox: { width: 116, backgroundColor: colors.card, borderRadius: 20, padding: 12, alignItems: 'center', gap: 6 },
  bubble: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.gold, borderTopLeftRadius: 4, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, paddingVertical: 12, paddingHorizontal: 14 },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 8 },
  bang: { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.red, borderWidth: 2, borderColor: colors.onDark, alignItems: 'center', justifyContent: 'center' },
});
