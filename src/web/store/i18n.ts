import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useLocalStore } from '@/web/store/local';
import { builtInLocales, englishLocale } from '@/web/i18n/locales';
import { formatMessage, normalizeMessageKey } from '@/web/i18n/translate';

const LOCALE_KEY = 'locale';

function normalizePack(pack: typeof englishLocale) {
  const messages: Record<string, string> = {};
  for (const [key, value] of Object.entries(pack.messages)) {
    messages[normalizeMessageKey(key)] = value;
  }
  return {
    code: pack.code,
    name: pack.name,
    messages,
  };
}

const locales = builtInLocales.map(normalizePack);

export const useI18nStore = defineStore('i18n', () => {
  const localStore = useLocalStore();
  const currentCode = ref(loadSavedCode());

  const current = computed(() => {
    return locales.find((pack) => pack.code === currentCode.value) ?? locales[0];
  });

  function loadSavedCode(): string {
    try {
      const saved = localStore.get(LOCALE_KEY) as { code?: string } | null;
      if (saved && typeof saved.code === 'string' && locales.some((pack) => pack.code === saved.code)) {
        return saved.code;
      }
    } catch {
      // empty
    }
    return englishLocale.code;
  }

  function t(key: string, ...args: Array<string | number>): string {
    const normalized = normalizeMessageKey(key);
    const translated = current.value.messages[normalized] ?? normalized;
    return formatMessage(translated, args);
  }

  function setLocale(code: string): void {
    if (!locales.some((pack) => pack.code === code)) {
      return;
    }
    currentCode.value = code;
    localStore.set(LOCALE_KEY, { code });
  }

  return {
    currentCode,
    current,
    locales,
    t,
    setLocale,
  };
});
