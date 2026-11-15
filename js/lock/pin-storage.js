/* AudioPIN Lock: storing the PIN — never the PIN itself.
   Only a slow PBKDF2 hash with a random salt is kept. Honest limit: with 10,000 PINs a stolen
   hash can still be brute-forced offline; real phones keep the attempt counter in secure hardware. */

let memoryState = null;   // fallback when localStorage is unavailable (e.g. private mode)

function loadState() { try { return JSON.parse(localStorage.getItem(STORE)) || memoryState; } catch (e) { return memoryState; } }
function saveState(state) { memoryState = state; try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }

const b64   = bytes => btoa(String.fromCharCode(...bytes));
const unb64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));

async function hashPin(pin, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, base, 256));
}

// Constant-time comparison, so timing does not reveal how much of the hash matched.
function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// PINs people pick most often fall to the first guesses, whatever the entry method.
function tooEasy(pin) {
  if (/^(\d)\1{3}$/.test(pin)) return true;                       // 0000, 1111, ...
  const steps = [1, 2, 3].map(i => (pin.charCodeAt(i) - pin.charCodeAt(i - 1) + 10) % 10);
  if (steps.every(s => s === 1) || steps.every(s => s === 9)) return true;   // 1234, 4321, 7890, ...
  return ['1212', '2580', '0852', '1004', '2000', '2001', '1122', '1010', '6969', '1990'].includes(pin);
}
