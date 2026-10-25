// Blacklist matching. Cosmetic differences are stripped from both sides before comparing
const MARKS = /[ً-ْٰـ]/g;            // diacritics and tatweel
const ALEF = /[آأإٱ]/g;              // alef with madda, hamza above, hamza below, wasla
const SPACE_OR_MARK = /[^\p{L}\p{N}]+/gu;                // whitespace, punctuation and symbols

export function norm(s) {
  return String(s || '')
    .replace(MARKS, '')
    .replace(ALEF, 'ا')
    .replace(/ة/g, 'ه')        // teh marbuta -> heh
    .replace(/ى/g, 'ي')        // alef maqsura -> yeh
    .replace(/ؤ/g, 'و')        // waw with hamza -> waw
    .replace(/ئ/g, 'ي')        // yeh with hamza -> yeh
    .replace(SPACE_OR_MARK, '')
    .toLowerCase();
}

// Returns the original phrase found in the text, or null
export function findWord(text, words) {
  const hay = norm(text);
  if (!hay) return null;
  for (const w of words) {
    const needle = norm(w);
    if (needle && hay.includes(needle)) return w;
  }
  return null;
}
