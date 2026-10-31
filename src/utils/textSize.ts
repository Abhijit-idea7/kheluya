const STORAGE_KEY = 'chala-kheluya-text-large';

export function readTextLarge(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeTextLarge(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // localStorage unavailable
  }
}

export function applyTextLargeToDocument(value: boolean) {
  document.documentElement.classList.toggle('text-large', value);
}
