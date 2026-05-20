export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://clearpath-backend-marl.onrender.com/v1';

export const LANGUAGES = [
  { code: 'en', locale: 'en-US', flag: '🇬🇧', label: 'English',    nativeLabel: 'English'    },
  { code: 'fr', locale: 'fr-FR', flag: '🇫🇷', label: 'French',     nativeLabel: 'Français'   },
  { code: 'ko', locale: 'ko-KR', flag: '🇰🇷', label: 'Korean',     nativeLabel: '한국어'      },
  { code: 'es', locale: 'es-ES', flag: '🇪🇸', label: 'Spanish',    nativeLabel: 'Español'    },
  { code: 'ro', locale: 'ro-RO', flag: '🇷🇴', label: 'Romanian',   nativeLabel: 'Română'     },
  { code: 'pt', locale: 'pt-BR', flag: '🇧🇷', label: 'Portuguese', nativeLabel: 'Português'  },
  { code: 'ar', locale: 'ar-SA', flag: '🇸🇦', label: 'Arabic',     nativeLabel: 'العربية'    },
  { code: 'de', locale: 'de-DE', flag: '🇩🇪', label: 'German',     nativeLabel: 'Deutsch'    },
  { code: 'it', locale: 'it-IT', flag: '🇮🇹', label: 'Italian',    nativeLabel: 'Italiano'   },
  { code: 'tr', locale: 'tr-TR', flag: '🇹🇷', label: 'Turkish',    nativeLabel: 'Türkçe'     },
];

export const ADDICTIONS = [
  { value: 'smoking',      label: 'Smoking' },
  { value: 'alcohol',      label: 'Alcohol' },
  { value: 'drugs',        label: 'Drugs' },
  { value: 'gambling',     label: 'Gambling' },
  { value: 'pornography',  label: 'Pornography' },
  { value: 'gaming',       label: 'Gaming' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'shopping',     label: 'Shopping' },
];

export const STAGES = [
  { value: 'curious',    label: 'Just curious' },
  { value: 'cutting',    label: 'Cutting down' },
  { value: 'quitting',   label: 'Quitting' },
  { value: 'recovering', label: 'Recovering' },
  { value: 'relapsed',   label: 'Relapsed' },
];

export const COLORS = {
  primary:    '#4F46E5',
  primaryDark:'#3730A3',
  secondary:  '#10B981',
  danger:     '#EF4444',
  warning:    '#F59E0B',
  background: '#F9FAFB',
  card:       '#FFFFFF',
  text:       '#111827',
  textMuted:  '#6B7280',
  border:     '#E5E7EB',
};
