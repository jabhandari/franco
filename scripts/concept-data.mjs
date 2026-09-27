// Curriculum concept data. Rich A1 lessons are fully authored; every other
// level is a generated stub (stub: true) until real lesson content is written.
// Prerequisite edges drive the roadmap connectors in the UI.
export const conceptPrerequisites = {
  "subject-pronouns": [
    "basic-sentence-structure"
  ],
  "noun-gender": [
    "subject-pronouns"
  ],
  "what-is-conjugation": [
    "subject-pronouns"
  ],
  "definite-articles": [
    "noun-gender"
  ],
  "indefinite-articles": [
    "noun-gender"
  ],
  "singular-plural": [
    "definite-articles",
    "indefinite-articles"
  ],
  "present-tense": [
    "what-is-conjugation"
  ],
  "regular-er-verbs": [
    "present-tense"
  ],
  "etre": [
    "present-tense"
  ],
  "avoir": [
    "present-tense"
  ],
  "aller": [
    "singular-plural",
    "regular-er-verbs",
    "etre",
    "avoir"
  ],
  "adjective-agreement": [
    "aller"
  ],
  "negation": [
    "adjective-agreement"
  ],
  "asking-questions": [
    "adjective-agreement"
  ],
  "imperfect-intro": [
    "passe-compose"
  ],
  "reflexive-verbs": [
    "imperfect-intro"
  ],
  "direct-object-pronouns": [
    "reflexive-verbs"
  ],
  "future-proche": [
    "direct-object-pronouns"
  ],
  "comparatives": [
    "future-proche"
  ],
  "superlatives": [
    "comparatives"
  ],
  "future-simple": [
    "passe-compose-vs-imparfait"
  ],
  "conditional-present": [
    "future-simple"
  ],
  "relative-pronouns": [
    "conditional-present"
  ],
  "expressing-opinion": [
    "relative-pronouns"
  ],
  "cause-and-consequence": [
    "expressing-opinion"
  ],
  "hypothesis": [
    "cause-and-consequence"
  ],
  "reported-speech": [
    "advanced-subjunctive"
  ],
  "advanced-relative-pronouns": [
    "reported-speech"
  ],
  "discourse-connectors": [
    "advanced-relative-pronouns"
  ],
  "formal-register": [
    "discourse-connectors"
  ],
  "argumentation": [
    "formal-register"
  ],
  "c1-discours-rapporte-avance": [
    "c1-nuance-lexicale"
  ],
  "c1-connecteurs-avances": [
    "c1-discours-rapporte-avance"
  ],
  "c1-registres-de-langue": [
    "c1-connecteurs-avances"
  ],
  "c2-idiomes": [
    "c2-implicite"
  ],
  "c2-argumentation-avancee": [
    "c2-idiomes"
  ],
  "c2-precision-stylistique": [
    "c2-argumentation-avancee"
  ]
};
export const concepts = [
  {
    "id": "basic-sentence-structure",
    "level": "A1",
    "category": "grammar",
    "title": "Basic sentence structure",
    "shortDescription": "Build clear French sentences with a subject, verb, and object.",
    "theory": [
      [
        "idea",
        "French statements usually begin with the subject, followed by the verb."
      ],
      [
        "rule",
        "Subject + verb + object",
        "Je mange une pomme. — I eat an apple."
      ],
      [
        "tip",
        "Keep the subject pronoun with the verb while you build confidence."
      ]
    ],
    "vocabulary": [
      "je",
      "manger",
      "une pomme"
    ],
    "examples": [
      [
        "Je parle français.",
        "I speak French."
      ],
      [
        "Nous aimons le café.",
        "We like coffee."
      ]
    ],
    "sources": [
      [
        "Tex’s French Grammar",
        "https://laits.utexas.edu/tex/gr/"
      ]
    ],
    "stub": false
  },
  {
    "id": "subject-pronouns",
    "level": "A1",
    "category": "grammar",
    "title": "Subject pronouns",
    "shortDescription": "Choose the pronoun that tells us who is doing the action.",
    "theory": [
      [
        "idea",
        "French verbs change with the subject. Pronouns make the subject explicit."
      ],
      [
        "table",
        "Pronoun",
        "English",
        "je",
        "I",
        "tu",
        "you (informal)",
        "il / elle",
        "he / she",
        "nous",
        "we",
        "vous",
        "you (formal or plural)",
        "ils / elles",
        "they"
      ]
    ],
    "vocabulary": [
      "je",
      "tu",
      "vous",
      "nous"
    ],
    "examples": [
      [
        "Tu travailles.",
        "You work."
      ],
      [
        "Elles arrivent.",
        "They arrive."
      ]
    ],
    "sources": [
      [
        "Français interactif — University of Texas",
        "https://laits.utexas.edu/fi/"
      ]
    ],
    "stub": false
  },
  {
    "id": "noun-gender",
    "level": "A1",
    "category": "grammar",
    "title": "Nouns & gender",
    "shortDescription": "Learn why French nouns are masculine or feminine and why articles change.",
    "theory": [
      [
        "idea",
        "Every French noun is treated as masculine or feminine. This affects the words around it."
      ],
      [
        "rule",
        "Learn the article with the noun",
        "la maison (the house) · un livre (a book)"
      ],
      [
        "tip",
        "Do not memorize maison alone. Memorize la maison."
      ]
    ],
    "vocabulary": [
      "la maison",
      "un livre",
      "la voiture",
      "le restaurant"
    ],
    "examples": [
      [
        "La table est grande.",
        "The table is big."
      ],
      [
        "Le livre est ici.",
        "The book is here."
      ]
    ],
    "sources": [
      [
        "Tex’s French Grammar",
        "https://laits.utexas.edu/tex/gr/"
      ],
      [
        "Lingolia — French nouns",
        "https://francais.lingolia.com/en/grammar/nouns-and-articles"
      ]
    ],
    "stub": false
  },
  {
    "id": "definite-articles",
    "level": "A1",
    "category": "grammar",
    "title": "Definite articles",
    "shortDescription": "Use le, la, l’ and les for “the”.",
    "theory": [
      [
        "table",
        "Article",
        "Use",
        "le",
        "masculine singular",
        "la",
        "feminine singular",
        "l’",
        "before a vowel sound",
        "les",
        "plural"
      ]
    ],
    "vocabulary": [
      "le",
      "la",
      "l’",
      "les"
    ],
    "examples": [
      [
        "le café",
        "the coffee"
      ],
      [
        "les enfants",
        "the children"
      ]
    ],
    "sources": [
      [
        "Lingolia — French articles",
        "https://francais.lingolia.com/en/grammar/articles"
      ]
    ],
    "stub": false
  },
  {
    "id": "indefinite-articles",
    "level": "A1",
    "category": "grammar",
    "title": "Indefinite articles",
    "shortDescription": "Use un, une and des for “a”, “an” and “some”.",
    "theory": [
      [
        "rule",
        "un is masculine, une is feminine, and des is plural.",
        "un ami · une amie · des amis"
      ],
      [
        "tip",
        "The article gives you an early clue about noun gender."
      ]
    ],
    "vocabulary": [
      "un",
      "une",
      "des"
    ],
    "examples": [
      [
        "J’ai une idée.",
        "I have an idea."
      ]
    ],
    "sources": [
      [
        "Lingolia — French articles",
        "https://francais.lingolia.com/en/grammar/articles"
      ]
    ],
    "stub": false
  },
  {
    "id": "singular-plural",
    "level": "A1",
    "category": "grammar",
    "title": "Singular & plural",
    "shortDescription": "Make nouns and their articles agree in number.",
    "theory": [
      [
        "idea",
        "Most written French plurals add -s, although the final sound often stays the same."
      ],
      [
        "rule",
        "le livre → les livres · une voiture → des voitures",
        "Articles change even when pronunciation does not."
      ]
    ],
    "vocabulary": [
      "un ami",
      "des amis",
      "la rue",
      "les rues"
    ],
    "examples": [
      [
        "Les étudiants arrivent.",
        "The students arrive."
      ]
    ],
    "sources": [
      [
        "Tex’s French Grammar",
        "https://laits.utexas.edu/tex/gr/"
      ]
    ],
    "stub": false
  },
  {
    "id": "what-is-conjugation",
    "level": "A1",
    "category": "grammar",
    "title": "What is conjugation?",
    "shortDescription": "Understand why a verb changes shape for each subject.",
    "theory": [
      [
        "idea",
        "Conjugation is changing a verb to show who acts and when."
      ],
      [
        "example",
        "parler → je parle, tu parles, nous parlons",
        "The verb stem stays familiar while its ending changes."
      ]
    ],
    "vocabulary": [
      "parler",
      "finir",
      "vendre"
    ],
    "examples": [
      [
        "Je travaille.",
        "I work."
      ]
    ],
    "sources": [
      [
        "Lingolia — French verbs",
        "https://francais.lingolia.com/en/grammar/verbs"
      ]
    ],
    "stub": false
  },
  {
    "id": "present-tense",
    "level": "A1",
    "category": "grammar",
    "title": "Present tense",
    "shortDescription": "Talk about what is happening now and what usually happens.",
    "theory": [
      [
        "idea",
        "Use the present for current actions, routines, and simple facts."
      ],
      [
        "rule",
        "Je travaille à Montréal.",
        "I work in Montreal."
      ]
    ],
    "vocabulary": [
      "être",
      "avoir",
      "aller",
      "faire"
    ],
    "examples": [
      [
        "Nous étudions le français.",
        "We study French."
      ]
    ],
    "sources": [
      [
        "Lingolia — Tenses",
        "https://francais.lingolia.com/en/grammar/tenses"
      ]
    ],
    "stub": false
  },
  {
    "id": "regular-er-verbs",
    "level": "A1",
    "category": "grammar",
    "title": "Regular -ER verbs",
    "shortDescription": "Conjugate the most common French verb family.",
    "theory": [
      [
        "table",
        "Subject",
        "parler",
        "je",
        "parle",
        "tu",
        "parles",
        "il/elle",
        "parle",
        "nous",
        "parlons",
        "vous",
        "parlez",
        "ils/elles",
        "parlent"
      ],
      [
        "tip",
        "The endings are predictable; practise them with short, useful sentences."
      ]
    ],
    "vocabulary": [
      "parler",
      "aimer",
      "travailler"
    ],
    "examples": [
      [
        "Vous aimez la musique.",
        "You like music."
      ]
    ],
    "sources": [
      [
        "Tex’s French Grammar",
        "https://laits.utexas.edu/tex/gr/"
      ]
    ],
    "stub": false
  },
  {
    "id": "etre",
    "level": "A1",
    "category": "grammar",
    "title": "Être",
    "shortDescription": "Use être to identify people, describe states, and form many expressions.",
    "theory": [
      [
        "rule",
        "je suis · tu es · il/elle est · nous sommes · vous êtes · ils/elles sont",
        "Learn these forms as a single high-frequency set."
      ]
    ],
    "vocabulary": [
      "suis",
      "es",
      "est",
      "sommes",
      "êtes",
      "sont"
    ],
    "examples": [
      [
        "Je suis canadien.",
        "I am Canadian."
      ]
    ],
    "sources": [
      [
        "Tex’s French Grammar",
        "https://laits.utexas.edu/tex/gr/"
      ]
    ],
    "stub": false
  },
  {
    "id": "avoir",
    "level": "A1",
    "category": "grammar",
    "title": "Avoir",
    "shortDescription": "Use avoir for possession, age, and common expressions.",
    "theory": [
      [
        "rule",
        "j’ai · tu as · il/elle a · nous avons · vous avez · ils/elles ont",
        "French says “have 20 years” for age: J’ai vingt ans."
      ]
    ],
    "vocabulary": [
      "j’ai",
      "tu as",
      "nous avons"
    ],
    "examples": [
      [
        "Elle a une voiture.",
        "She has a car."
      ]
    ],
    "sources": [
      [
        "Tex’s French Grammar",
        "https://laits.utexas.edu/tex/gr/"
      ]
    ],
    "stub": false
  },
  {
    "id": "aller",
    "level": "A1",
    "category": "grammar",
    "title": "Aller",
    "shortDescription": "Use aller to talk about going and near-future plans.",
    "theory": [
      [
        "rule",
        "je vais · tu vas · il/elle va · nous allons · vous allez · ils/elles vont",
        "Je vais travailler. means I am going to work."
      ]
    ],
    "vocabulary": [
      "vais",
      "vas",
      "va",
      "allons"
    ],
    "examples": [
      [
        "Nous allons au marché.",
        "We are going to the market."
      ]
    ],
    "sources": [
      [
        "Tex’s French Grammar",
        "https://laits.utexas.edu/tex/gr/"
      ]
    ],
    "stub": false
  },
  {
    "id": "adjective-agreement",
    "level": "A1",
    "category": "grammar",
    "title": "Adjective agreement",
    "shortDescription": "Make adjectives match the noun’s gender and number.",
    "theory": [
      [
        "idea",
        "An adjective often adds -e for feminine and -s for plural in writing."
      ],
      [
        "example",
        "un petit café · une petite maison · des petites maisons",
        "The adjective follows the noun’s features."
      ]
    ],
    "vocabulary": [
      "petit",
      "grande",
      "nouveau"
    ],
    "examples": [
      [
        "Une voiture rouge.",
        "A red car."
      ]
    ],
    "sources": [
      [
        "Lingolia — French adjectives",
        "https://francais.lingolia.com/en/grammar/adjectives"
      ]
    ],
    "stub": false
  },
  {
    "id": "negation",
    "level": "A1",
    "category": "grammar",
    "title": "Negation",
    "shortDescription": "Say that something is not true with ne … pas.",
    "theory": [
      [
        "rule",
        "ne + conjugated verb + pas",
        "Je ne comprends pas. — I do not understand."
      ],
      [
        "tip",
        "In everyday speech, ne is often dropped, but keep it in careful writing."
      ]
    ],
    "vocabulary": [
      "ne",
      "pas",
      "jamais"
    ],
    "examples": [
      [
        "Nous ne sommes pas prêts.",
        "We are not ready."
      ]
    ],
    "sources": [
      [
        "Tex’s French Grammar",
        "https://laits.utexas.edu/tex/gr/"
      ]
    ],
    "stub": false
  },
  {
    "id": "asking-questions",
    "level": "A1",
    "category": "communication",
    "title": "Asking questions",
    "shortDescription": "Ask simple questions with intonation, est-ce que, or question words.",
    "theory": [
      [
        "rule",
        "Est-ce que vous parlez français ?",
        "Est-ce que works in many everyday questions."
      ],
      [
        "example",
        "Où habitez-vous ? — Where do you live?",
        "Question words usually come first."
      ]
    ],
    "vocabulary": [
      "qui",
      "où",
      "quand",
      "comment",
      "pourquoi"
    ],
    "examples": [
      [
        "Est-ce que tu as faim ?",
        "Are you hungry?"
      ]
    ],
    "sources": [
      [
        "Tex’s French Grammar",
        "https://laits.utexas.edu/tex/gr/"
      ]
    ],
    "stub": false
  },
  {
    "id": "passe-compose",
    "level": "A2",
    "category": "grammar",
    "title": "Passé composé",
    "shortDescription": "Talk about completed past events.",
    "theory": [
      [
        "idea",
        "Talk about completed past events."
      ],
      [
        "tip",
        "Start with a short example, then notice the pattern in your reading."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Lingolia French Grammar",
        "https://francais.lingolia.com/en/grammar"
      ]
    ],
    "stub": true
  },
  {
    "id": "imperfect-intro",
    "level": "A2",
    "category": "grammar",
    "title": "Imparfait introduction",
    "shortDescription": "Describe background, habits, and ongoing past states.",
    "theory": [
      [
        "idea",
        "Describe background, habits, and ongoing past states."
      ],
      [
        "tip",
        "Start with a short example, then notice the pattern in your reading."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Lingolia French Grammar",
        "https://francais.lingolia.com/en/grammar"
      ]
    ],
    "stub": true
  },
  {
    "id": "reflexive-verbs",
    "level": "A2",
    "category": "grammar",
    "title": "Reflexive verbs",
    "shortDescription": "Talk about routines with me, te, se and related forms.",
    "theory": [
      [
        "idea",
        "Talk about routines with me, te, se and related forms."
      ],
      [
        "tip",
        "Start with a short example, then notice the pattern in your reading."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Lingolia French Grammar",
        "https://francais.lingolia.com/en/grammar"
      ]
    ],
    "stub": true
  },
  {
    "id": "direct-object-pronouns",
    "level": "A2",
    "category": "grammar",
    "title": "Direct object pronouns",
    "shortDescription": "Replace a person or thing receiving an action.",
    "theory": [
      [
        "idea",
        "Replace a person or thing receiving an action."
      ],
      [
        "tip",
        "Start with a short example, then notice the pattern in your reading."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Lingolia French Grammar",
        "https://francais.lingolia.com/en/grammar"
      ]
    ],
    "stub": true
  },
  {
    "id": "future-proche",
    "level": "A2",
    "category": "grammar",
    "title": "Futur proche",
    "shortDescription": "Express a near-future plan with aller + infinitive.",
    "theory": [
      [
        "idea",
        "Express a near-future plan with aller + infinitive."
      ],
      [
        "tip",
        "Start with a short example, then notice the pattern in your reading."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Lingolia French Grammar",
        "https://francais.lingolia.com/en/grammar"
      ]
    ],
    "stub": true
  },
  {
    "id": "comparatives",
    "level": "A2",
    "category": "grammar",
    "title": "Comparatives",
    "shortDescription": "Compare people, things, and actions.",
    "theory": [
      [
        "idea",
        "Compare people, things, and actions."
      ],
      [
        "tip",
        "Start with a short example, then notice the pattern in your reading."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Lingolia French Grammar",
        "https://francais.lingolia.com/en/grammar"
      ]
    ],
    "stub": true
  },
  {
    "id": "superlatives",
    "level": "A2",
    "category": "grammar",
    "title": "Superlatives",
    "shortDescription": "Say the most, least, best, or worst.",
    "theory": [
      [
        "idea",
        "Say the most, least, best, or worst."
      ],
      [
        "tip",
        "Start with a short example, then notice the pattern in your reading."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Lingolia French Grammar",
        "https://francais.lingolia.com/en/grammar"
      ]
    ],
    "stub": true
  },
  {
    "id": "passe-compose-vs-imparfait",
    "level": "B1",
    "category": "communication",
    "title": "Passé composé vs imparfait",
    "shortDescription": "Choose between completed events and background description.",
    "theory": [
      [
        "idea",
        "Choose between completed events and background description."
      ],
      [
        "tip",
        "Read the examples in context and underline the linking words."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Council of Europe CEFR descriptors",
        "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors"
      ]
    ],
    "stub": true
  },
  {
    "id": "future-simple",
    "level": "B1",
    "category": "communication",
    "title": "Future simple",
    "shortDescription": "Discuss plans and predictions beyond the immediate future.",
    "theory": [
      [
        "idea",
        "Discuss plans and predictions beyond the immediate future."
      ],
      [
        "tip",
        "Read the examples in context and underline the linking words."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Council of Europe CEFR descriptors",
        "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors"
      ]
    ],
    "stub": true
  },
  {
    "id": "conditional-present",
    "level": "B1",
    "category": "communication",
    "title": "Conditional present",
    "shortDescription": "Express polite requests and hypothetical outcomes.",
    "theory": [
      [
        "idea",
        "Express polite requests and hypothetical outcomes."
      ],
      [
        "tip",
        "Read the examples in context and underline the linking words."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Council of Europe CEFR descriptors",
        "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors"
      ]
    ],
    "stub": true
  },
  {
    "id": "relative-pronouns",
    "level": "B1",
    "category": "communication",
    "title": "Relative pronouns",
    "shortDescription": "Connect ideas with qui, que, où, and dont.",
    "theory": [
      [
        "idea",
        "Connect ideas with qui, que, où, and dont."
      ],
      [
        "tip",
        "Read the examples in context and underline the linking words."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Council of Europe CEFR descriptors",
        "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors"
      ]
    ],
    "stub": true
  },
  {
    "id": "expressing-opinion",
    "level": "B1",
    "category": "communication",
    "title": "Expressing opinion",
    "shortDescription": "Give a view, support it, and soften disagreement.",
    "theory": [
      [
        "idea",
        "Give a view, support it, and soften disagreement."
      ],
      [
        "tip",
        "Read the examples in context and underline the linking words."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Council of Europe CEFR descriptors",
        "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors"
      ]
    ],
    "stub": true
  },
  {
    "id": "cause-and-consequence",
    "level": "B1",
    "category": "communication",
    "title": "Cause and consequence",
    "shortDescription": "Link ideas with clear logical relationships.",
    "theory": [
      [
        "idea",
        "Link ideas with clear logical relationships."
      ],
      [
        "tip",
        "Read the examples in context and underline the linking words."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Council of Europe CEFR descriptors",
        "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors"
      ]
    ],
    "stub": true
  },
  {
    "id": "hypothesis",
    "level": "B1",
    "category": "communication",
    "title": "Hypothesis",
    "shortDescription": "Talk about possible situations and their results.",
    "theory": [
      [
        "idea",
        "Talk about possible situations and their results."
      ],
      [
        "tip",
        "Read the examples in context and underline the linking words."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Council of Europe CEFR descriptors",
        "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors"
      ]
    ],
    "stub": true
  },
  {
    "id": "advanced-subjunctive",
    "level": "B2",
    "category": "writing",
    "title": "Advanced subjunctive",
    "shortDescription": "Use the subjunctive to frame doubt, necessity, emotion, and judgement.",
    "theory": [
      [
        "idea",
        "Use the subjunctive to frame doubt, necessity, emotion, and judgement."
      ],
      [
        "tip",
        "Notice register and connector choices when reading longer texts."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Council of Europe CEFR descriptors",
        "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors"
      ]
    ],
    "stub": true
  },
  {
    "id": "reported-speech",
    "level": "B2",
    "category": "writing",
    "title": "Reported speech",
    "shortDescription": "Relate what someone said while managing tense and pronoun changes.",
    "theory": [
      [
        "idea",
        "Relate what someone said while managing tense and pronoun changes."
      ],
      [
        "tip",
        "Notice register and connector choices when reading longer texts."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Council of Europe CEFR descriptors",
        "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors"
      ]
    ],
    "stub": true
  },
  {
    "id": "advanced-relative-pronouns",
    "level": "B2",
    "category": "writing",
    "title": "Advanced relative pronouns",
    "shortDescription": "Use lequel, auquel, and auquel-family forms precisely.",
    "theory": [
      [
        "idea",
        "Use lequel, auquel, and auquel-family forms precisely."
      ],
      [
        "tip",
        "Notice register and connector choices when reading longer texts."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Council of Europe CEFR descriptors",
        "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors"
      ]
    ],
    "stub": true
  },
  {
    "id": "discourse-connectors",
    "level": "B2",
    "category": "writing",
    "title": "Discourse connectors",
    "shortDescription": "Shape a clear argument with sophisticated transitions.",
    "theory": [
      [
        "idea",
        "Shape a clear argument with sophisticated transitions."
      ],
      [
        "tip",
        "Notice register and connector choices when reading longer texts."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Council of Europe CEFR descriptors",
        "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors"
      ]
    ],
    "stub": true
  },
  {
    "id": "formal-register",
    "level": "B2",
    "category": "writing",
    "title": "Formal register",
    "shortDescription": "Adapt vocabulary and grammar to professional and academic contexts.",
    "theory": [
      [
        "idea",
        "Adapt vocabulary and grammar to professional and academic contexts."
      ],
      [
        "tip",
        "Notice register and connector choices when reading longer texts."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Council of Europe CEFR descriptors",
        "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors"
      ]
    ],
    "stub": true
  },
  {
    "id": "argumentation",
    "level": "B2",
    "category": "writing",
    "title": "Argumentation",
    "shortDescription": "Build a nuanced position with evidence and concessions.",
    "theory": [
      [
        "idea",
        "Build a nuanced position with evidence and concessions."
      ],
      [
        "tip",
        "Notice register and connector choices when reading longer texts."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [
      [
        "Council of Europe CEFR descriptors",
        "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors"
      ]
    ],
    "stub": true
  },
  {
    "id": "c1-nuance-lexicale",
    "level": "C1",
    "category": "communication",
    "title": "Lexical nuance",
    "shortDescription": "Choose precise vocabulary for subtle distinctions in meaning.",
    "theory": [
      [
        "idea",
        "Choose precise vocabulary for subtle distinctions in meaning."
      ],
      [
        "tip",
        "Stub concept: full lesson content has not been authored yet."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [],
    "stub": true
  },
  {
    "id": "c1-discours-rapporte-avance",
    "level": "C1",
    "category": "communication",
    "title": "Advanced reported speech",
    "shortDescription": "Report complex statements with accurate tense and mood shifts.",
    "theory": [
      [
        "idea",
        "Report complex statements with accurate tense and mood shifts."
      ],
      [
        "tip",
        "Stub concept: full lesson content has not been authored yet."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [],
    "stub": true
  },
  {
    "id": "c1-connecteurs-avances",
    "level": "C1",
    "category": "communication",
    "title": "Advanced connectors",
    "shortDescription": "Structure long arguments with sophisticated linking devices.",
    "theory": [
      [
        "idea",
        "Structure long arguments with sophisticated linking devices."
      ],
      [
        "tip",
        "Stub concept: full lesson content has not been authored yet."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [],
    "stub": true
  },
  {
    "id": "c1-registres-de-langue",
    "level": "C1",
    "category": "communication",
    "title": "Language registers",
    "shortDescription": "Shift between formal, neutral, and informal registers appropriately.",
    "theory": [
      [
        "idea",
        "Shift between formal, neutral, and informal registers appropriately."
      ],
      [
        "tip",
        "Stub concept: full lesson content has not been authored yet."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [],
    "stub": true
  },
  {
    "id": "c2-implicite",
    "level": "C2",
    "category": "communication",
    "title": "Implicit meaning",
    "shortDescription": "Infer unstated meaning, irony, and cultural references.",
    "theory": [
      [
        "idea",
        "Infer unstated meaning, irony, and cultural references."
      ],
      [
        "tip",
        "Stub concept: full lesson content has not been authored yet."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [],
    "stub": true
  },
  {
    "id": "c2-idiomes",
    "level": "C2",
    "category": "communication",
    "title": "Idiomatic mastery",
    "shortDescription": "Use idioms and fixed expressions naturally and accurately.",
    "theory": [
      [
        "idea",
        "Use idioms and fixed expressions naturally and accurately."
      ],
      [
        "tip",
        "Stub concept: full lesson content has not been authored yet."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [],
    "stub": true
  },
  {
    "id": "c2-argumentation-avancee",
    "level": "C2",
    "category": "communication",
    "title": "Advanced argumentation",
    "shortDescription": "Build rigorous, well-supported positions on abstract topics.",
    "theory": [
      [
        "idea",
        "Build rigorous, well-supported positions on abstract topics."
      ],
      [
        "tip",
        "Stub concept: full lesson content has not been authored yet."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [],
    "stub": true
  },
  {
    "id": "c2-precision-stylistique",
    "level": "C2",
    "category": "communication",
    "title": "Stylistic precision",
    "shortDescription": "Refine style: rhythm, emphasis, and rhetorical devices.",
    "theory": [
      [
        "idea",
        "Refine style: rhythm, emphasis, and rhetorical devices."
      ],
      [
        "tip",
        "Stub concept: full lesson content has not been authored yet."
      ]
    ],
    "vocabulary": [],
    "examples": [],
    "sources": [],
    "stub": true
  }
];
