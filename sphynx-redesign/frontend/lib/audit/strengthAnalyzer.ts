/**
 * Password Strength Analyzer — Phase 7: Security Audit Garden
 * 
 * Computes effective entropy, detects predictable patterns, and classifies
 * passwords into strength tiers. All analysis occurs exclusively in browser memory.
 */

export type PasswordClassification = 'Weak' | 'Fair' | 'Strong' | 'Sanctuary Grade';

export interface StrengthResult {
  entropy: number;
  classification: PasswordClassification;
  characterClasses: number;
  length: number;
  patternsDetected: string[];
}

// Common keyboard walks (QWERTY layout)
const KEYBOARD_ROWS = [
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  '1234567890',
];

// Common dictionary words (10,000+ word list condensed to high-frequency passwords)
// In production, this would be a larger list loaded lazily
const COMMON_WORDS: Set<string> = new Set([
  'password', 'dragon', 'master', 'monkey', 'shadow', 'sunshine', 'princess',
  'football', 'charlie', 'simple', 'welcome', 'letmein', 'trustno', 'batman',
  'access', 'hello', 'admin', 'qwerty', 'login', 'starwars', 'solo', 'passw0rd',
  'flower', 'dragon', 'baseball', 'iloveyou', 'michael', 'jordan', 'superman',
  'hunter', 'ranger', 'buster', 'soccer', 'hockey', 'killer', 'george', 'andrew',
  'michelle', 'daniel', 'jessica', 'pepper', 'summer', 'winter', 'spring', 'autumn',
  'secret', 'freedom', 'whatever', 'thunder', 'ginger', 'hammer', 'silver', 'golden',
  'cookie', 'butter', 'cheese', 'coffee', 'orange', 'banana', 'apple', 'mango',
  'computer', 'internet', 'network', 'system', 'server', 'database', 'security',
  'account', 'manager', 'control', 'digital', 'online', 'website', 'domain',
  'love', 'life', 'time', 'world', 'people', 'money', 'power', 'music',
  'house', 'family', 'friend', 'school', 'college', 'university', 'student',
  'teacher', 'doctor', 'lawyer', 'engineer', 'science', 'nature', 'animal',
  'tiger', 'eagle', 'shark', 'wolf', 'bear', 'lion', 'snake', 'horse',
  'black', 'white', 'green', 'blue', 'yellow', 'purple', 'brown', 'pink',
]);

/**
 * Computes Shannon entropy of a password based on character class pool size.
 */
function computeBaseEntropy(password: string): number {
  if (password.length === 0) return 0;

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33;

  if (poolSize === 0) return 0;
  return password.length * Math.log2(poolSize);
}

/**
 * Counts distinct character classes present in the password.
 */
function countCharacterClasses(password: string): number {
  let classes = 0;
  if (/[a-z]/.test(password)) classes++;
  if (/[A-Z]/.test(password)) classes++;
  if (/[0-9]/.test(password)) classes++;
  if (/[^a-zA-Z0-9]/.test(password)) classes++;
  return classes;
}

/**
 * Detects sequential characters (3+ consecutive ascending or descending).
 */
function detectSequentialPatterns(password: string): { patterns: string[]; totalLength: number } {
  const patterns: string[] = [];
  let totalLength = 0;
  let i = 0;

  while (i < password.length - 2) {
    let seqLen = 1;
    const ascending = password.charCodeAt(i + 1) - password.charCodeAt(i) === 1;
    const descending = password.charCodeAt(i) - password.charCodeAt(i + 1) === 1;

    if (ascending) {
      while (i + seqLen < password.length && password.charCodeAt(i + seqLen) - password.charCodeAt(i + seqLen - 1) === 1) {
        seqLen++;
      }
    } else if (descending) {
      while (i + seqLen < password.length && password.charCodeAt(i + seqLen - 1) - password.charCodeAt(i + seqLen) === 1) {
        seqLen++;
      }
    }

    if (seqLen >= 3) {
      patterns.push(`sequential: "${password.slice(i, i + seqLen)}"`);
      totalLength += seqLen;
      i += seqLen;
    } else {
      i++;
    }
  }

  return { patterns, totalLength };
}

/**
 * Detects repeated characters (3+ consecutive identical characters).
 */
function detectRepeatedPatterns(password: string): { patterns: string[]; totalLength: number } {
  const patterns: string[] = [];
  let totalLength = 0;
  let i = 0;

  while (i < password.length) {
    let repLen = 1;
    while (i + repLen < password.length && password[i + repLen] === password[i]) {
      repLen++;
    }

    if (repLen >= 3) {
      patterns.push(`repeated: "${password[i]}" ×${repLen}`);
      totalLength += repLen;
    }
    i += repLen;
  }

  return { patterns, totalLength };
}

/**
 * Detects keyboard walk patterns (3+ adjacent keyboard positions).
 */
function detectKeyboardWalks(password: string): { patterns: string[]; totalLength: number } {
  const patterns: string[] = [];
  let totalLength = 0;
  const lower = password.toLowerCase();

  for (const row of KEYBOARD_ROWS) {
    for (let start = 0; start <= row.length - 3; start++) {
      for (let len = row.length - start; len >= 3; len--) {
        const walk = row.slice(start, start + len);
        const idx = lower.indexOf(walk);
        if (idx !== -1) {
          patterns.push(`keyboard walk: "${walk}"`);
          totalLength += walk.length;
          break;
        }
      }
    }
  }

  return { patterns, totalLength };
}

/**
 * Detects common dictionary words (4+ characters).
 */
function detectDictionaryWords(password: string): { patterns: string[]; totalLength: number } {
  const patterns: string[] = [];
  let totalLength = 0;
  const lower = password.toLowerCase();

  for (const word of COMMON_WORDS) {
    if (word.length >= 4 && lower.includes(word)) {
      patterns.push(`dictionary: "${word}"`);
      totalLength += word.length;
    }
  }

  return { patterns, totalLength };
}

/**
 * Detects date format patterns (e.g., 1990, 01/01, 2024-01-01).
 */
function detectDatePatterns(password: string): { patterns: string[]; totalLength: number } {
  const patterns: string[] = [];
  let totalLength = 0;

  // Year patterns (1900-2099)
  const yearRegex = /(?:19|20)\d{2}/g;
  let match;
  while ((match = yearRegex.exec(password)) !== null) {
    patterns.push(`date: "${match[0]}"`);
    totalLength += match[0].length;
  }

  // Date separators (MM/DD, DD-MM, etc.)
  const dateRegex = /\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?/g;
  while ((match = dateRegex.exec(password)) !== null) {
    patterns.push(`date format: "${match[0]}"`);
    totalLength += match[0].length;
  }

  return { patterns, totalLength };
}

/**
 * Analyzes a password and returns its strength classification.
 * All computation occurs in-memory with no network calls.
 */
export function analyzePassword(password: string): StrengthResult {
  // Handle empty passwords
  if (!password || password.length === 0) {
    return {
      entropy: 0,
      classification: 'Weak',
      characterClasses: 0,
      length: 0,
      patternsDetected: [],
    };
  }

  const baseEntropy = computeBaseEntropy(password);
  const characterClasses = countCharacterClasses(password);
  const allPatterns: string[] = [];
  let totalPatternLength = 0;

  // Detect all pattern types
  const sequential = detectSequentialPatterns(password);
  allPatterns.push(...sequential.patterns);
  totalPatternLength += sequential.totalLength;

  const repeated = detectRepeatedPatterns(password);
  allPatterns.push(...repeated.patterns);
  totalPatternLength += repeated.totalLength;

  const keyboard = detectKeyboardWalks(password);
  allPatterns.push(...keyboard.patterns);
  totalPatternLength += keyboard.totalLength;

  const dictionary = detectDictionaryWords(password);
  allPatterns.push(...dictionary.patterns);
  totalPatternLength += dictionary.totalLength;

  const dates = detectDatePatterns(password);
  allPatterns.push(...dates.patterns);
  totalPatternLength += dates.totalLength;

  // Apply entropy penalty: reduce by (baseEntropy × patternLength / totalLength)
  // Cap pattern length to password length to avoid over-penalizing
  const effectivePatternLength = Math.min(totalPatternLength, password.length);
  const penalty = baseEntropy * (effectivePatternLength / password.length);
  const effectiveEntropy = Math.max(0, baseEntropy - penalty);

  // Classify based on effective entropy
  let classification: PasswordClassification;
  if (effectiveEntropy < 28) {
    classification = 'Weak';
  } else if (effectiveEntropy < 50) {
    classification = 'Fair';
  } else if (effectiveEntropy < 75) {
    classification = 'Strong';
  } else {
    classification = 'Sanctuary Grade';
  }

  return {
    entropy: Math.round(effectiveEntropy * 10) / 10,
    classification,
    characterClasses,
    length: password.length,
    patternsDetected: allPatterns,
  };
}
