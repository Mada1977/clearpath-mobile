import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  STATS:        'bp_cache_stats',
  LOGS:         'bp_cache_logs',
  COPING_TIPS:  'bp_cache_coping_tips',
};

// ── Stats ────────────────────────────────────────────────────────
export async function cacheStats(stats: object) {
  await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(stats));
}

export async function getCachedStats(): Promise<any | null> {
  const raw = await AsyncStorage.getItem(KEYS.STATS);
  return raw ? JSON.parse(raw) : null;
}

// ── Logs ─────────────────────────────────────────────────────────
export async function cacheLogs(logs: object[]) {
  await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
}

export async function getCachedLogs(): Promise<any[]> {
  const raw = await AsyncStorage.getItem(KEYS.LOGS);
  return raw ? JSON.parse(raw) : [];
}

// ── Coping tips (5 per language, hardcoded) ──────────────────────
const COPING_TIPS: Record<string, string[]> = {
  en: [
    'Take 5 slow deep breaths — inhale 4 counts, hold 4, exhale 4.',
    'Drink a large glass of cold water slowly.',
    'Go outside or open a window — fresh air disrupts the craving reflex.',
    'Call or text someone you trust right now.',
    'This craving will peak and pass in 5–10 minutes. Just hold on.',
  ],
  fr: [
    'Prends 5 respirations lentes — inspire 4 temps, retiens 4, expire 4.',
    'Bois un grand verre d\'eau froide lentement.',
    'Sors ou ouvre une fenêtre — l\'air frais coupe l\'envie.',
    'Appelle ou envoie un message à quelqu\'un de confiance.',
    'Cette envie va passer en 5 à 10 minutes. Tiens bon.',
  ],
  es: [
    'Respira lentamente 5 veces: inhala 4 tiempos, mantén 4, exhala 4.',
    'Bebe despacio un vaso grande de agua fría.',
    'Sal o abre una ventana — el aire fresco interrumpe el impulso.',
    'Llama o escribe a alguien de confianza ahora mismo.',
    'Este impulso pasará en 5-10 minutos. Solo aguanta.',
  ],
  de: [
    'Atme 5 Mal langsam: 4 Zählungen einatmen, 4 halten, 4 ausatmen.',
    'Trinke langsam ein großes Glas kaltes Wasser.',
    'Geh nach draußen oder öffne ein Fenster.',
    'Ruf jemanden an oder schreib eine Nachricht.',
    'Dieses Verlangen wird in 5-10 Minuten vergehen. Halte durch.',
  ],
  it: [
    'Fai 5 respiri lenti: inspira 4 tempi, tieni 4, espira 4.',
    'Bevi lentamente un grande bicchiere d\'acqua fredda.',
    'Esci o apri una finestra — l\'aria fresca interrompe il desiderio.',
    'Chiama o scrivi a qualcuno di fiducia ora.',
    'Questo desiderio passerà in 5-10 minuti. Resisti.',
  ],
  pt: [
    'Respira lentamente 5 vezes: inspira 4 tempos, segura 4, expira 4.',
    'Bebe devagar um copo grande de água fria.',
    'Sai ou abre uma janela — o ar fresco interrompe o impulso.',
    'Liga ou manda mensagem a alguém de confiança agora.',
    'Este impulso vai passar em 5-10 minutos. Aguenta.',
  ],
  ro: [
    'Respiră lent de 5 ori: inspiră 4 timpi, ține 4, expiră 4.',
    'Bea un pahar mare de apă rece încet.',
    'Ieși afară sau deschide o fereastră.',
    'Sună sau trimite un mesaj cuiva de încredere acum.',
    'Această poftă va trece în 5-10 minute. Rezistă.',
  ],
  ar: [
    'خذ 5 أنفاس بطيئة وعميقة: شهيق 4 عدّات، احتبس 4، زفير 4.',
    'اشرب كوبًا كبيرًا من الماء البارد ببطء.',
    'اخرج أو افتح نافذة — الهواء النقي يقطع الرغبة.',
    'اتصل بأحد أو أرسل رسالة لشخص تثق به الآن.',
    'هذه الرغبة ستمر في 5-10 دقائق. صمود.',
  ],
  ko: [
    '천천히 깊게 숨을 5번 쉬세요: 4박자 들숨, 4박자 멈춤, 4박자 날숨.',
    '차가운 물 한 컵을 천천히 마시세요.',
    '밖으로 나가거나 창문을 여세요.',
    '지금 바로 신뢰하는 사람에게 전화하거나 문자하세요.',
    '이 갈망은 5~10분 안에 지나갑니다. 버티세요.',
  ],
  tr: [
    '5 kez yavaş nefes al: 4 sayı nefes al, 4 tut, 4 ver.',
    'Büyük bir bardak soğuk suyu yavaşça iç.',
    'Dışarı çık veya bir pencere aç.',
    'Güvendiğin birine hemen telefon et veya mesaj at.',
    'Bu istek 5-10 dakika içinde geçecek. Dayan.',
  ],
};

export async function cacheCopingTips(locale: string) {
  const lang = locale.slice(0, 2).toLowerCase();
  const tips = COPING_TIPS[lang] ?? COPING_TIPS['en'];
  await AsyncStorage.setItem(KEYS.COPING_TIPS, JSON.stringify(tips));
}

export async function getCachedCopingTips(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.COPING_TIPS);
  return raw ? JSON.parse(raw) : COPING_TIPS['en'];
}
