/**
 * Lightweight language detector for job listings.
 * Checks for English vs German stop-word frequency.
 * Returns 'en', 'de', or null (undecided).
 */

const EN_WORDS = new Set([
  'the','and','for','with','you','your','our','we','are','will','this','that',
  'have','from','has','not','but','they','can','all','been','their','more',
  'about','which','when','than','its','also','into','other','do','as','an','at',
  'be','by','if','on','or','so','up','us','was','were','it','in','is','to','of',
  'a','he','she','his','her','him','them','who','what','how','team','job','work',
  'role','position','experience','skills','required','responsibilities',
  'candidate','opportunity','apply','offer','company','join','must','strong',
  'excellent','looking','background','knowledge','ability',
]);

const DE_WORDS = new Set([
  'und','der','die','das','für','mit','sie','wir','bei','als','an','auf','im',
  'ist','des','dem','den','ein','eine','einer','einem','von','zu','nach','oder',
  'auch','aus','durch','werden','können','haben','sind','sich','nicht','mehr',
  'ihre','ihrem','ihrer','wird','werden','dass','wenn','aber','alle','noch',
  'dein','ihre','unser','seine','einen','einer','sowie','ihre','m/w/d','gmbh',
  'ihr','uns','wir','einem','einer','stelle','erfahrung','kenntnisse',
  'bewerbung','aufgaben','anforderungen','freude','teamarbeit','vollzeit',
  'teilzeit','unbefristet','befristet','standort',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zäöüß\s/()]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

export function detectLanguage(title: string, description: string): 'en' | 'de' | null {
  const sample = `${title} ${description.slice(0, 800)}`;
  const tokens = tokenize(sample);

  if (tokens.length < 10) return null;

  let en = 0;
  let de = 0;

  for (const token of tokens) {
    if (EN_WORDS.has(token)) en++;
    if (DE_WORDS.has(token)) de++;
  }

  const total = en + de;
  if (total < 5) return null;

  const enRatio = en / total;
  // Need at least 55% English dominance to label as English
  if (enRatio >= 0.55) return 'en';
  // Need at least 55% German dominance to label as German
  if (enRatio <= 0.45) return 'de';

  return null; // Mixed / ambiguous
}
