/** Words the generator writes into the website itself, in the website's language. */
const STRINGS = {
  en: {
    builtWith: 'Built with WebCity 🏙️',
    empty: 'This page is empty for now.',
    more: 'More ▾',
    choose: 'Choose…',
    send: 'Send',
    sendMessage: 'Send message',
    signUp: 'Sign up',
    buyNow: 'Buy now',
    pickPlan: 'Choose',
    popular: 'Most popular',
    clickMe: 'Click me',
    noVideo: 'Paste a YouTube link in the Television to show your video here.',
    backToTop: 'Back to top',
    darkMode: 'Dark mode',
    search: 'Search',
    searchHint: 'Search this website…',
    noResults: 'Nothing found.',
    contact: 'Contact us',
  },
  fa: {
    builtWith: 'ساخته‌شده با وب‌سیتی 🏙️',
    empty: 'این صفحه فعلاً خالی است.',
    more: 'بیشتر ▾',
    choose: 'انتخاب کنید…',
    send: 'ارسال',
    sendMessage: 'ارسال پیام',
    signUp: 'عضویت',
    buyNow: 'خرید',
    pickPlan: 'انتخاب',
    popular: 'محبوب‌ترین',
    clickMe: 'کلیک کنید',
    noVideo: 'لینک یوتیوب را در «تلویزیون» بگذارید تا ویدیو اینجا نمایش داده شود.',
    backToTop: 'بازگشت به بالا',
    darkMode: 'حالت تیره',
    search: 'جست‌وجو',
    searchHint: 'در این سایت جست‌وجو کنید…',
    noResults: 'چیزی پیدا نشد.',
    contact: 'تماس با ما',
  },
};

export type SiteText = (typeof STRINGS)['en'];

const RTL_LANGUAGES = new Set(['fa', 'ar', 'he', 'ur']);

export const siteText = (lang: string | undefined): SiteText => (lang === 'fa' ? STRINGS.fa : STRINGS.en);

export const isRtlLanguage = (lang: string | undefined) => RTL_LANGUAGES.has(lang ?? 'en');

/** "auto" follows the language: Persian and Arabic read right to left. */
export function siteDirection(lang: string | undefined, dir: 'auto' | 'ltr' | 'rtl' = 'auto'): 'ltr' | 'rtl' {
  if (dir !== 'auto') return dir;
  return isRtlLanguage(lang) ? 'rtl' : 'ltr';
}
