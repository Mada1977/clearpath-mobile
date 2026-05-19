export type Helpline = { name: string; number: string };

export const HELPLINES: Record<string, Helpline[]> = {
  en: [
    { name: 'Samaritans (UK)', number: '116 123' },
    { name: 'SAMHSA (US)', number: '1-800-662-4357' },
  ],
  fr: [
    { name: 'Numéro national prévention suicide', number: '3114' },
  ],
  de: [
    { name: 'Telefonseelsorge', number: '0800 111 0 111' },
  ],
  es: [
    { name: 'Teléfono de la Esperanza', number: '024' },
  ],
  it: [
    { name: 'Telefono Amico', number: '800 274 274' },
  ],
  pt: [
    { name: 'SOS Voz Amiga', number: '213 544 545' },
  ],
  ro: [
    { name: 'Linia de criză', number: '0800 801 200' },
  ],
  ar: [
    { name: 'الخط الوطني للأزمات (السعودية)', number: '920033360' },
    { name: 'خط الدعم النفسي (مصر)', number: '08008880700' },
  ],
  ko: [
    { name: '자살예방상담전화', number: '1393' },
  ],
  tr: [
    { name: 'İntihar Önleme Hattı', number: '182' },
  ],
};

export function getHelplinesByLocale(locale: string): Helpline[] {
  const lang = locale.slice(0, 2).toLowerCase();
  return HELPLINES[lang] ?? HELPLINES['en'];
}
