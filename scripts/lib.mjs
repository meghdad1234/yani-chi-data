// نرمال‌سازی واژهٔ فارسی برای جست‌وجو (همین تابع باید در API هم استفاده شود)
export function normFa(s) {
  return String(s)
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640\u200c\u200d\u200e\u200f]/g, '') // اعراب، کشیده، نیم‌فاصله و کاراکترهای جهت
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ۀةە]/g, 'ه')
    .replace(/[أإٱ]/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
