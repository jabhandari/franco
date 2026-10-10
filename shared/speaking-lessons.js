// Short, authored models for the six original speaking tasks. A model phrase is
// practice material, not the one correct answer to an open-ended prompt.
const lessons = {
  orig_speaking_a1: {
    focus: 'Introduce yourself with short, useful sentences.',
    strategy: 'Start with your name and where you live. Add one thing you enjoy.',
    phrases: [
      { id: 'intro', french: "Je m'appelle Camille et j'habite à Montréal.", english: 'My name is Camille and I live in Montréal.', tip: 'Swap the name and city for your own.' },
      { id: 'likes', french: "J'aime lire et passer du temps avec mes amis.", english: 'I like reading and spending time with my friends.', tip: 'Use j’aime + an activity to talk about your interests.' },
    ],
  },
  orig_speaking_a2: {
    focus: 'Tell a simple story about a past trip.',
    strategy: 'Say where you went, who you went with, and what you enjoyed.',
    phrases: [
      { id: 'trip', french: "L'été dernier, nous avons voyagé à Québec en famille.", english: 'Last summer, we traveled to Québec as a family.', tip: 'Use the past tense to place your trip in time.' },
      { id: 'favorite', french: "Nous avons visité la ville et j'ai beaucoup aimé les cafés.", english: 'We visited the city and I really liked the cafés.', tip: 'Add one detail about what you did and liked.' },
    ],
  },
  orig_speaking_b1: {
    focus: 'Give an opinion and support it with reasons.',
    strategy: 'Acknowledge two points of view, then state what you think.',
    phrases: [
      { id: 'balance', french: 'Les réseaux sociaux peuvent être utiles, mais ils présentent aussi des risques.', english: 'Social networks can be useful, but they also carry risks.', tip: 'Use mais to contrast two ideas.' },
      { id: 'opinion', french: "À mon avis, il faut apprendre aux jeunes à les utiliser avec prudence.", english: 'In my opinion, young people should learn to use them carefully.', tip: 'À mon avis clearly introduces your own position.' },
    ],
  },
  orig_speaking_b2: {
    focus: 'Build an argument and consider a counterpoint.',
    strategy: 'State your position on remote work, give an example, then qualify it.',
    phrases: [
      { id: 'position', french: 'Le télétravail offre plus de liberté, notamment pour organiser sa journée.', english: 'Remote work offers more freedom, especially for organizing the day.', tip: 'Notamment introduces a concrete example.' },
      { id: 'nuance', french: "Cependant, il peut être difficile de maintenir l'esprit d'équipe à distance.", english: 'However, it can be difficult to maintain team spirit at a distance.', tip: 'Cependant signals a counterpoint.' },
    ],
  },
  orig_speaking_c1: {
    focus: 'Develop a nuanced reflection about freedom.',
    strategy: 'Interpret the quotation, then explore where one freedom meets another.',
    phrases: [
      { id: 'thesis', french: 'La liberté individuelle implique aussi une responsabilité envers les autres.', english: 'Individual freedom also implies responsibility toward others.', tip: 'State a central idea before developing it.' },
      { id: 'nuance', french: "Il convient toutefois de distinguer la liberté d'expression de l'incitation à la haine.", english: 'It is nevertheless necessary to distinguish freedom of expression from incitement to hatred.', tip: 'Toutefois introduces a careful distinction.' },
    ],
  },
  orig_speaking_c2: {
    focus: 'Weigh competing ideas about scientific progress.',
    strategy: 'Present a principle, then qualify it with a real consequence.',
    phrases: [
      { id: 'thesis', french: 'Le progrès scientifique ne saurait être dissocié de ses conséquences sociales.', english: 'Scientific progress cannot be separated from its social consequences.', tip: 'Ne saurait être is a formal way to state a strong principle.' },
      { id: 'nuance', french: "Encore faut-il que les limites proposées reposent sur un débat démocratique éclairé.", english: 'Even so, any proposed limits must rest on an informed democratic debate.', tip: 'Encore faut-il adds a condition to your argument.' },
    ],
  },
};

const originalItemIds = {
  it_orig_0007: 'orig_speaking_a1',
  it_orig_0008: 'orig_speaking_a2',
  it_orig_0009: 'orig_speaking_b1',
  it_orig_0010: 'orig_speaking_b2',
  it_orig_0011: 'orig_speaking_c1',
  it_orig_0012: 'orig_speaking_c2',
};

export function getSpeakingLesson(externalId, itemId) {
  const key = Object.hasOwn(lessons, externalId) ? externalId : originalItemIds[itemId];
  return key ? lessons[key] : null;
}
