// Prompt/passage cleaning for exam questions.
//
// Cleaning belongs in the IMPORT PATH: importers must store a clean prompt and
// context. These helpers are the single implementation importers use, so the
// UI never has to do fragile regex surgery at render time.

export function cleanExamPrompt(prompt) {
  return String(prompt || '')
    .replace(/^Sur le livret,\s*vous lisez\s*:\s*/i, '')
    .replace(/\s*Cochez (?:une case|la bonne réponse)[\s\S]*$/i, '')
    .trim();
}

export function cleanExamPassage(prompt, context) {
  const cleanPrompt = cleanExamPrompt(prompt);
  let passage = String(context || '')
    .replace(/^.*?Sur le livret,\s*vous lisez\s*:\s*/i, '')
    .replace(/^Sur le livret,\s*vous lisez\s*:\s*/i, '')
    .replace(/\s*Cochez (?:une case|la bonne réponse)[\s\S]*$/i, '')
    .trim();
  if (cleanPrompt && passage.toLowerCase().startsWith(cleanPrompt.toLowerCase())) {
    passage = passage.slice(cleanPrompt.length).trim();
  }
  passage = passage.replace(/^A\.\s+[\s\S]*$/i, '').trim();
  if (passage && passage.toLowerCase() === cleanPrompt.toLowerCase()) passage = '';
  return { prompt: cleanPrompt, passage };
}
