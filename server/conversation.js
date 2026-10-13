// Read-only speaking prompts: suggestions and hints never create mastery,
// completion, scheduling or attempt records.
export function conversationScenario(concepts, pick = 0, personalized = false) {
  const offset = concepts.length ? pick % concepts.length : 0;
  const rotated = concepts.slice(offset).concat(concepts.slice(0,offset));
  const selected = rotated.slice(0,4);
  const situations = ['Roleplay an everyday situation','Tell a friend about your day','Plan a weekend with a friend','Meet someone new'];
  const targets = selected.map(concept => {
    const metadata = concept.metadata_json || {};
    const example = metadata.examples?.find(row => typeof row?.[0] === 'string' && row[0].trim())?.[0] || null;
    const pointer = metadata.theory?.find(row => row?.[0] === 'tip')?.[1] || concept.description || 'Try this pattern in a sentence of your own.';
    return {id:concept.id,section:concept.level_code || 'A1',title:concept.title,text:concept.description || concept.title,
      hint:{sentence:example,pointer}};
  });
  return {scenario:selected.length ? `${situations[pick % situations.length]} using: ${selected.slice(0,3).map(c=>c.title).join(', ')}` : `${situations[pick % situations.length]}: introduce yourself, where you live and what you do.`,targets,
    message:personalized ? 'Built from your weakest tracked concepts.' : 'Starter concepts for your level. Practice exercises to personalize this.'};
}
