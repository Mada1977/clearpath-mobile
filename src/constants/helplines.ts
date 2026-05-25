import { Linking } from 'react-native';

export type Helpline = {
  name: string;
  number: string;
  available?: string;
  isEmergency?: boolean; // rendered with red highlight
  isWeb?: boolean;       // open in browser instead of dialler
};

// ─── International block — shown at top for ALL users ───────────────────────
export const INTERNATIONAL_HELPLINES: Helpline[] = [
  {
    name: '112 — Universal emergency',
    number: '112',
    available: '24/7 · 190+ countries (Europe, Asia, Africa)',
    isEmergency: true,
  },
  { name: '911 (USA / Canada)',  number: '911', available: '24/7' },
  { name: '999 (UK)',            number: '999', available: '24/7' },
  { name: '000 (Australia)',     number: '000', available: '24/7' },
  {
    name: 'Befrienders Worldwide',
    number: 'befrienders.org',
    available: '24/7 · Global',
    isWeb: true,
  },
  {
    name: 'Crisis Text Line',
    number: '741741',
    available: 'USA / UK / Canada / Ireland — Text HOME',
  },
  {
    name: 'IASP Crisis Centres',
    number: 'iasp.info/resources/Crisis_Centres',
    available: '24/7 · Global directory',
    isWeb: true,
  },
];

// ─── Country/language-specific lines ────────────────────────────────────────
export const LOCAL_HELPLINES: Record<string, Helpline[]> = {
  en: [
    { name: 'Samaritans (UK / Ireland)', number: '116 123',         available: '24/7' },
    { name: 'SAMHSA Helpline (US)',       number: '1-800-662-4357',  available: '24/7' },
    { name: 'Frank Drug Helpline (UK)',   number: '0300 123 6600',   available: '24/7' },
    { name: 'GamCare (UK)',               number: '0808 802 0133',   available: '24/7' },
  ],
  fr: [
    { name: '3114 — Prévention suicide',  number: '3114',            available: '24h/24' },
    { name: 'Alcool Info Service',         number: '0 980 980 930',   available: '7j/7'  },
    { name: 'Drogues Info Service',        number: '0 800 23 13 13',  available: '7j/7'  },
    { name: 'Joueurs Info Service',        number: '09 74 75 13 13',  available: 'Lun–Ven' },
  ],
  de: [
    { name: 'Telefonseelsorge',            number: '0800 111 0 111',  available: '24/7' },
    { name: 'Suchthotline',                number: '01806 313031',    available: '24/7' },
    { name: 'BZgA Glücksspielsucht',       number: '0800 040 0140',   available: '24/7' },
  ],
  es: [
    { name: 'Teléfono de la Esperanza',    number: '717 003 717',     available: '24/7' },
    { name: 'Atención a Drogodependencias',number: '900 200 514',     available: '24/7' },
    { name: 'Jugadores Anónimos España',   number: '91 447 34 68',    available: 'Lun–Vie' },
  ],
  it: [
    { name: 'Telefono Amico',              number: '02 2327 2327',    available: '24/7' },
    { name: 'SerD Dipendenze',             number: '800 274 274',     available: 'Lun–Ven' },
    { name: 'Gioco Responsabile',          number: '800 558 822',     available: '24/7' },
  ],
  pt: [
    { name: 'SOS Voz Amiga',               number: '213 544 545',     available: '24/7' },
    { name: 'Linha Vida',                  number: '1414',            available: '24/7' },
    { name: 'CVV (Brasil)',                number: '188',             available: '24/7' },
  ],
  ro: [
    { name: 'Telefonul Speranței',         number: '0800 801 200',    available: '24/7' },
    { name: 'ALIAT — Dependențe',          number: '021 316 00 00',   available: 'Lun–Vin' },
  ],
  ar: [
    { name: 'خط مساعدة نفسية (السعودية)',  number: '920033360',       available: '24/7' },
    { name: 'خط نجدة (مصر)',              number: '08008880700',     available: '24/7' },
    { name: 'خط مساعدة (UAE)',            number: '800-4673',        available: '24/7' },
    { name: 'خط الاستغاثة (المغرب)',       number: '0801 00 3030',    available: '24/7' },
  ],
  ko: [
    { name: '자살예방상담전화',            number: '1393',            available: '24/7' },
    { name: '정신건강 위기상담 전화',      number: '1577-0199',       available: '24/7' },
    { name: '한국도박문제관리센터',        number: '1336',            available: '24/7' },
    { name: '한국마약퇴치운동본부',        number: '1899-0893',       available: '월–금' },
  ],
  tr: [
    { name: 'İntihar Önleme (ALO 182)',    number: '182',             available: '24/7' },
    { name: 'ALO 191 — Uyuşturucu',        number: '191',             available: '24/7' },
    { name: 'Yeşilay Danışma Hattı',       number: '0850 455 0 455',  available: '24/7' },
  ],
};

export const WORK_HELPLINES: Helpline[] = [
  {
    name: 'Workaholics Anonymous',
    number: 'workaholics-anonymous.org',
    available: 'Global · 12-step support',
    isWeb: true,
  },
  {
    name: 'International Stress Management Association',
    number: 'isma.org.uk',
    available: 'Resources & support',
    isWeb: true,
  },
  {
    name: 'Mental Health America — Work-Life Balance',
    number: 'mhanational.org',
    available: 'Resources & self-help tools',
    isWeb: true,
  },
];

/** Returns international numbers first, then language-specific ones.
 *  Pass addictions to include work-specific resources when 'work' is present. */
export function getHelplinesByLocale(locale: string, addictions?: string[]): Helpline[] {
  const lang  = locale.slice(0, 2).toLowerCase();
  const isWork = addictions?.includes('work');
  const local = isWork ? WORK_HELPLINES : (LOCAL_HELPLINES[lang] ?? LOCAL_HELPLINES['en']);
  return [...INTERNATIONAL_HELPLINES, ...local];
}

/** Open a helpline — phone numbers open the dialler, web URLs open the browser. */
export function openHelpline(h: Helpline) {
  if (h.isWeb) {
    const url = h.number.startsWith('http') ? h.number : `https://${h.number}`;
    Linking.openURL(url).catch(() => {});
  } else {
    Linking.openURL(`tel:${h.number.replace(/\s/g, '')}`).catch(() => {});
  }
}
