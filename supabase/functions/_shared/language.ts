const EN_WORDS = new Set([
  'the','and','for','with','you','your','our','we','are','will','this','that',
  'have','from','has','not','but','they','can','all','been','their','more',
  'about','which','when','than','its','also','into','other','do','as','an','at',
  'be','by','if','on','or','so','up','us','was','were','it','in','is','to','of',
  'a','team','job','work','role','position','experience','skills','required',
  'responsibilities','candidate','opportunity','apply','offer','company','join',
  'must','strong','excellent','looking','background','knowledge','ability',
]);

const DE_WORDS = new Set([
  'und','der','die','das','für','mit','sie','wir','bei','als','an','auf','im',
  'ist','des','dem','den','ein','eine','einer','einem','von','zu','nach','oder',
  'auch','aus','durch','werden','können','haben','sind','sich','nicht','mehr',
  'ihre','ihrem','ihrer','wird','dass','wenn','aber','alle','noch','unser',
  'einen','sowie','stelle','erfahrung','kenntnisse','bewerbung','aufgaben',
  'anforderungen','freude','teamarbeit','vollzeit','teilzeit','standort',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zäöüß\s/()]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

export function detectLanguage(title: string, description = ''): 'en' | 'de' | null {
  const tokens = tokenize(`${title} ${description.slice(0, 800)}`);
  if (tokens.length < 10) return null;

  let en = 0;
  let de = 0;
  for (const token of tokens) {
    if (EN_WORDS.has(token)) en += 1;
    if (DE_WORDS.has(token)) de += 1;
  }

  const total = en + de;
  if (total < 5) return null;
  const enRatio = en / total;
  if (enRatio >= 0.65) return 'en';
  if (enRatio <= 0.45) return 'de';
  return null;
}
