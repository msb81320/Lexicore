import { Deck, VocabularyLearningUnit } from '../types';
import { createInitialFSRSState, createInitialDimensionsMastery } from '../engine/scheduler';
import { State } from 'ts-fsrs';

export const INITIAL_DECKS: Deck[] = [
  {
    id: 'deck_ielts_master',
    name: 'IELTS Band 8+ Masterclass',
    description: 'High-leverage academic lexicon, sophisticated collocations, and idiomatic chunks.',
    color: '#6366f1', // Indigo
    iconName: 'Award',
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'deck_gre_advanced',
    name: 'GRE & Nuanced Literary Vocab',
    description: 'Precise rhetoric, tone markers, intellectual discernment, and philosophical distinctions.',
    color: '#0ea5e9', // Sky
    iconName: 'BookOpen',
    createdAt: Date.now() - 86400000 * 5,
  },
];

const now = new Date();
const pastHour = new Date(Date.now() - 1000 * 60 * 30);
const dueNow = new Date(Date.now() - 1000 * 60 * 5).toISOString();

export const INITIAL_UNITS: VocabularyLearningUnit[] = [
  {
    id: 'unit_shun',
    word: 'shun',
    phonetic: '/ʃʌn/',
    partOfSpeech: 'transitive verb',
    cefrLevel: 'C1',
    definition: 'Persistently avoid, reject, or keep away from someone or something through deliberate choice or social censure.',
    nuancedDefinitions: [
      'To ostracize socially or refuse association with as a moral or cultural sanction.',
      'To steer clear of a habit, venue, or behavior intentionally (e.g. publicity, alcohol).'
    ],
    etymology: 'Middle English shunien, from Old English scunian ("to abhor, shrink back").',
    register: 'Formal / Literary / Journalistic',
    mnemonic: 'Imagine putting on a "SHUN-glasses" to look away and deliberately ignore the cameras.',
    deckId: 'deck_ielts_master',
    tags: ['social', 'academic-action', 'ielts-band8'],
    chunks: [
      {
        id: 'chunk_shun_1',
        text: 'shun the limelight',
        meaning: 'Deliberately avoid public attention, celebrity status, or media scrutiny.',
        example: 'Despite her Nobel triumph, the biochemist continued to shun the limelight.',
        register: 'High-frequency Journalistic'
      },
      {
        id: 'chunk_shun_2',
        text: 'shun public scrutiny',
        meaning: 'Evade accountability or investigation by external observers and institutions.',
        example: 'Offshore financial institutions frequently shun public scrutiny.',
        register: 'Academic / Political'
      },
      {
        id: 'chunk_shun_3',
        text: 'shun dogmatic thinking',
        meaning: 'Reject rigid, unquestioned doctrines in favor of empirical or nuanced inquiry.',
        example: 'Rigorous scientific methodology requires researchers to shun dogmatic thinking.',
        register: 'Philosophical / IELTS Writing Task 2'
      }
    ],
    examples: [
      {
        sentence: 'Rather than engaging in partisan conflict, she opted to shun political tribalism.',
        sourceType: 'The Atlantic Analysis'
      },
      {
        sentence: 'Historically, members who broke communal covenants were systematically shunned by their peers.',
        sourceType: 'Sociological Review'
      },
      {
        sentence: 'Urban commuters are increasingly shunning private vehicles in favor of multimodal transit.',
        sourceType: 'Urban Planning Quarterly'
      }
    ],
    synonyms: [
      {
        word: 'avoid',
        nuanceDiff: 'Avoid is neutral and practical; shun implies conscious moral rejection or deep aversion.'
      },
      {
        word: 'ostracize',
        nuanceDiff: 'Ostracize specifically means community-wide exclusion, while shun can be done by an individual.'
      },
      {
        word: 'eschew',
        nuanceDiff: 'Eschew is formal and refers almost exclusively to abstaining from practices, vices, or luxuries.'
      }
    ],
    antonyms: ['embrace', 'court', 'seek', 'welcome'],
    variants: [
      {
        id: 'var_shun_word2meaning',
        type: 'word_to_meaning',
        testedDimension: 'meaning_recall',
        prompt: 'shun',
        subPrompt: 'verb • /ʃʌn/',
        targetAnswer: 'Persistently avoid, reject, or keep away from through deliberate choice or social censure.',
        explanation: 'To shun is to actively and deliberately steer clear of someone, a practice, or publicity.'
      },
      {
        id: 'var_shun_meaning2word',
        type: 'meaning_to_word',
        testedDimension: 'active_production',
        prompt: 'To deliberately avoid, reject, or refuse to associate with someone or something (starts with s-)',
        subPrompt: '4 letters • Verb',
        targetAnswer: 'shun',
        hint: 'Rhymes with "sun" or "run".',
        explanation: 'The word is "shun". Notice its concise, forceful Germanic root.'
      },
      {
        id: 'var_shun_cloze',
        type: 'cloze_context',
        testedDimension: 'contextual_usage',
        prompt: 'Despite his meteoric rise in cinema, the director preferred to _____ glamorous red-carpet interviews.',
        subPrompt: 'Fill in the blank with the appropriate C1 verb (base form)',
        targetAnswer: 'shun',
        hint: 'Synonym for deliberately avoid/eschew.',
        explanation: '"shun" fits the collocation with glamorous publicity and red-carpet events.'
      },
      {
        id: 'var_shun_chunk',
        type: 'chunk_completion',
        testedDimension: 'chunks_collocations',
        prompt: 'to _____ the limelight',
        subPrompt: 'Complete the native chunk meaning "deliberately avoid public attention"',
        targetAnswer: 'shun',
        hint: 'Begins with "sh-".',
        explanation: '"Shun the limelight" is one of English’s most pervasive native collocations.'
      },
      {
        id: 'var_shun_nuance',
        type: 'nuance_choice',
        testedDimension: 'nuance_distinction',
        prompt: 'Which verb specifically emphasizes deliberate moral rejection or intentional social distancing rather than accidental detour?',
        subPrompt: 'Select the most fitting lexical item',
        targetAnswer: 'shun',
        options: ['shun', 'bypass', 'sidestep', 'swerve'],
        explanation: 'While "bypass" and "swerve" are physical or tactical circumventions, "shun" implies moral or ideological refusal.'
      }
    ],
    fsrs: {
      ...createInitialFSRSState(),
      due: dueNow, // Due immediately for first test
      state: State.New,
    },
    dimensionsMastery: {
      meaning_recall: 40,
      contextual_usage: 30,
      chunks_collocations: 25,
      nuance_distinction: 20,
      active_production: 15,
    },
    variantStats: {},
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'unit_ubiquitous',
    word: 'ubiquitous',
    phonetic: '/juːˈbɪk.wɪ.təs/',
    partOfSpeech: 'adjective',
    cefrLevel: 'C1',
    definition: 'Present, appearing, or found everywhere simultaneously; omnipresent.',
    nuancedDefinitions: [
      'Pervasively common in daily modern life (e.g., smartphones, coffee shops).',
      'Constantly encountered to the point of being taken for granted.'
    ],
    etymology: 'From Modern Latin ubiquitas, from Latin ubique ("everywhere").',
    register: 'Academic / Journalistic / Technology',
    mnemonic: 'U-BI-QU-ITOUS sounds like "You be everywhere with us".',
    deckId: 'deck_ielts_master',
    tags: ['academic', 'technology', 'frequency'],
    chunks: [
      {
        id: 'chunk_ubiq_1',
        text: 'an increasingly ubiquitous presence',
        meaning: 'Something whose visibility and reach is steadily permeating every sphere.',
        example: 'Automated facial recognition has become an increasingly ubiquitous presence in urban centers.',
        register: 'Journalistic / Academic'
      },
      {
        id: 'chunk_ubiq_2',
        text: 'ubiquitous computing',
        meaning: 'Computing concept where digital processing is thoroughly integrated into everyday objects.',
        example: 'The Internet of Things has turned the vision of ubiquitous computing into a reality.',
        register: 'Tech / Computer Science'
      }
    ],
    examples: [
      {
        sentence: 'Coffee shops have become ubiquitous fixtures in virtually every metropolitan transit hub.',
        sourceType: 'Financial Times'
      },
      {
        sentence: 'The smartphone, once a luxury item, is now ubiquitous across every socio-economic demographic.',
        sourceType: 'Sociology of Technology'
      }
    ],
    synonyms: [
      {
        word: 'omnipresent',
        nuanceDiff: 'Omnipresent often carries religious or profound existential connotations; ubiquitous is standard for physical/technological presence.'
      },
      {
        word: 'pervasive',
        nuanceDiff: 'Pervasive often hints at something infiltrating deeply or unfavorably (e.g. pervasive smell or fear).'
      }
    ],
    antonyms: ['rare', 'scarce', 'isolated', 'sporadic'],
    variants: [
      {
        id: 'var_ubiq_word2meaning',
        type: 'word_to_meaning',
        testedDimension: 'meaning_recall',
        prompt: 'ubiquitous',
        subPrompt: 'adjective • /juːˈbɪk.wɪ.təs/',
        targetAnswer: 'Present, appearing, or found everywhere simultaneously; omnipresent.',
        explanation: 'From Latin "ubique" meaning everywhere.'
      },
      {
        id: 'var_ubiq_chunk',
        type: 'chunk_completion',
        testedDimension: 'chunks_collocations',
        prompt: 'an increasingly _____ presence',
        subPrompt: 'Complete the academic chunk meaning "spreading everywhere"',
        targetAnswer: 'ubiquitous',
        hint: '10 letters, starts with "u".',
        explanation: '"an increasingly ubiquitous presence" is a core Band 8+ descriptive collocation.'
      },
      {
        id: 'var_ubiq_cloze',
        type: 'cloze_context',
        testedDimension: 'contextual_usage',
        prompt: 'Plastic packaging is now so _____ in oceans that microparticles are found in marine life at all depths.',
        subPrompt: 'Fill in the blank with the C1 adjective',
        targetAnswer: 'ubiquitous',
        explanation: 'Ubiquitous precisely captures pervasive presence across all geographical points.'
      }
    ],
    fsrs: {
      ...createInitialFSRSState(),
      due: dueNow,
      state: State.New,
    },
    dimensionsMastery: {
      meaning_recall: 50,
      contextual_usage: 40,
      chunks_collocations: 30,
      nuance_distinction: 35,
      active_production: 25,
    },
    variantStats: {},
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'unit_ephemeral',
    word: 'ephemeral',
    phonetic: '/ɪˈfem.ər.əl/',
    partOfSpeech: 'adjective',
    cefrLevel: 'C2',
    definition: 'Lasting for a very short, transient period of time; fleeting.',
    nuancedDefinitions: [
      'Possessing an intrinsic brevity (like blossoms, youth, or social media trends).',
      'Biologically having a short lifecycle (e.g. ephemeral streams or plants).'
    ],
    etymology: 'From Greek ephemeros ("lasting only a day"), from epi ("on") + hemera ("day").',
    register: 'Literary / Academic / Philosophical',
    mnemonic: 'Ephemeral = E-photo-mental; like a Snapchat photo that disappears in seconds.',
    deckId: 'deck_gre_advanced',
    tags: ['time', 'transience', 'philosophical', 'gre-master'],
    chunks: [
      {
        id: 'chunk_ephem_1',
        text: 'the ephemeral nature of fame',
        meaning: 'How fleeting and quickly forgotten celebrity recognition truly is.',
        example: 'Modern viral sensations starkly illustrate the ephemeral nature of fame.',
        register: 'Cultural Criticism'
      },
      {
        id: 'chunk_ephem_2',
        text: 'ephemeral pleasures',
        meaning: 'Transitory sensory or emotional delights that pass away rapidly.',
        example: 'Stoic philosophy advises against anchoring one’s peace on ephemeral pleasures.',
        register: 'Philosophical'
      }
    ],
    examples: [
      {
        sentence: 'The blossoms of the cherry trees are cherished precisely because their beauty is ephemeral.',
        sourceType: 'Nature & Culture Essay'
      },
      {
        sentence: 'Financial bubbles create ephemeral fortunes that vanish as soon as market sentiment turns.',
        sourceType: 'Economic History Review'
      }
    ],
    synonyms: [
      {
        word: 'transient',
        nuanceDiff: 'Transient often relates to people or phenomena passing through; ephemeral highlights poetic or tragic brevity.'
      },
      {
        word: 'evanescent',
        nuanceDiff: 'Evanescent suggests gradually fading away like vapor or mist, while ephemeral simply denotes a brief lifespan.'
      }
    ],
    antonyms: ['perennial', 'enduring', 'eternal', 'permanent'],
    variants: [
      {
        id: 'var_ephem_meaning2word',
        type: 'meaning_to_word',
        testedDimension: 'active_production',
        prompt: 'Lasting for a very short time; fleeting or transitory (starts with e-)',
        subPrompt: '9 letters • Adjective • Greek origin "for a day"',
        targetAnswer: 'ephemeral',
        hint: 'Sounds like "eh-fem-er-uhl".',
        explanation: 'Ephemeral originates from the Greek for "living only for a single day".'
      },
      {
        id: 'var_ephem_chunk',
        type: 'chunk_completion',
        testedDimension: 'chunks_collocations',
        prompt: 'the _____ nature of fame',
        subPrompt: 'Complete the rhetorical chunk meaning "the fleeting quality of celebrity"',
        targetAnswer: 'ephemeral',
        explanation: '"The ephemeral nature of fame" contrasts momentary stardom with lasting achievement.'
      },
      {
        id: 'var_ephem_word2meaning',
        type: 'word_to_meaning',
        testedDimension: 'meaning_recall',
        prompt: 'ephemeral',
        subPrompt: 'adjective • /ɪˈfem.ər.əl/',
        targetAnswer: 'Lasting for a very short, transient period of time; fleeting.',
        explanation: 'A favorite GRE and high-register English descriptor for transient beauty or fame.'
      }
    ],
    fsrs: {
      ...createInitialFSRSState(),
      due: dueNow,
      state: State.New,
    },
    dimensionsMastery: {
      meaning_recall: 45,
      contextual_usage: 25,
      chunks_collocations: 20,
      nuance_distinction: 30,
      active_production: 15,
    },
    variantStats: {},
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'unit_ameliorate',
    word: 'ameliorate',
    phonetic: '/əˈmiː.li.ə.reɪt/',
    partOfSpeech: 'transitive verb',
    cefrLevel: 'C2',
    definition: 'Make something bad, unsatisfactory, or painful better or more tolerable.',
    nuancedDefinitions: [
      'Improve conditions, suffering, or hardship without necessarily eliminating the root cause entirely.',
      'Socio-political mitigation of systemic poverty, environmental distress, or pain.'
    ],
    etymology: 'From Latin melior ("better"), altered through French améliorer.',
    register: 'Formal / Academic / Policy / IELTS Band 8+',
    mnemonic: 'Ameliorate: "A meal you ate" ameliorated your starvation and made you feel better.',
    deckId: 'deck_ielts_master',
    tags: ['policy', 'social-welfare', 'academic-solution', 'gre'],
    chunks: [
      {
        id: 'chunk_amel_1',
        text: 'ameliorate living conditions',
        meaning: 'Improve basic housing, sanitation, and economic security for underprivileged communities.',
        example: 'Targeted micro-grants helped ameliorate living conditions across rural communities.',
        register: 'Development Economics'
      },
      {
        id: 'chunk_amel_2',
        text: 'ameliorate the symptoms of',
        meaning: 'Ease or relieve clinical discomfort without necessarily curing the underlying disease.',
        example: 'While the therapy cannot cure the ailment, it notably ameliorates the symptoms.',
        register: 'Medical / Scientific'
      }
    ],
    examples: [
      {
        sentence: 'The government rolled out tax credits to ameliorate the harsh impact of inflation on vulnerable households.',
        sourceType: 'Public Policy Journal'
      },
      {
        sentence: 'Planting urban tree canopies is one of the most cost-effective methods to ameliorate heat island effects.',
        sourceType: 'Environmental Science'
      }
    ],
    synonyms: [
      {
        word: 'improve',
        nuanceDiff: 'Improve is generic; ameliorate is specifically used when addressing a negative or distressing situation.'
      },
      {
        word: 'mitigate',
        nuanceDiff: 'Mitigate means to lessen severity or damage; ameliorate actively enhances the positive state of affairs.'
      }
    ],
    antonyms: ['exacerbate', 'worsen', 'aggravate'],
    variants: [
      {
        id: 'var_amel_cloze',
        type: 'cloze_context',
        testedDimension: 'contextual_usage',
        prompt: 'Urgent humanitarian aid was dispatched to _____ the suffering caused by the prolonged drought.',
        subPrompt: 'Insert formal verb meaning "to alleviate or improve a bad situation"',
        targetAnswer: 'ameliorate',
        hint: '10 letters, begins with "ame-".',
        explanation: 'Ameliorate precisely denotes relieving distress or making hardship more tolerable.'
      },
      {
        id: 'var_amel_chunk',
        type: 'chunk_completion',
        testedDimension: 'chunks_collocations',
        prompt: 'to _____ living conditions',
        subPrompt: 'Complete the policy collocation meaning "elevate the quality of life"',
        targetAnswer: 'ameliorate',
        explanation: '"ameliorate living conditions" is a staple collocation in sociological and IELTS band 8+ discourse.'
      },
      {
        id: 'var_amel_nuance',
        type: 'nuance_choice',
        testedDimension: 'nuance_distinction',
        prompt: 'Which word means to make an existing BAD or PAINFUL situation better (in contrast to simply upgrading something that was already okay)?',
        subPrompt: 'Discriminate nuance',
        targetAnswer: 'ameliorate',
        options: ['ameliorate', 'optimize', 'enhance', 'embellish'],
        explanation: '"Optimize" and "enhance" work on neutral or good systems. "Ameliorate" specifically targets unsatisfactory or suffering states.'
      }
    ],
    fsrs: {
      ...createInitialFSRSState(),
      due: dueNow,
      state: State.New,
    },
    dimensionsMastery: {
      meaning_recall: 35,
      contextual_usage: 25,
      chunks_collocations: 20,
      nuance_distinction: 25,
      active_production: 10,
    },
    variantStats: {},
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'unit_fastidious',
    word: 'fastidious',
    phonetic: '/fæˈstɪd.i.əs/',
    partOfSpeech: 'adjective',
    cefrLevel: 'C2',
    definition: 'Very attentive to and concerned about accuracy and detail; having high, demanding standards.',
    nuancedDefinitions: [
      'Exacting and meticulous in craft, organization, or research.',
      'Sometimes pejorative: excessively fussy, hard to please, or squeamish regarding cleanliness.'
    ],
    etymology: 'From Latin fastidiosus ("disdainful, squeamish"), from fastidium ("loathing, disgust").',
    register: 'Literary / Professional Review',
    mnemonic: 'Fastidious = "Fast & Tidy": someone obsessed with keeping everything immaculately tidy and strict.',
    deckId: 'deck_gre_advanced',
    tags: ['personality', 'precision', 'gre-master'],
    chunks: [
      {
        id: 'chunk_fast_1',
        text: 'fastidious attention to detail',
        meaning: 'Extreme, uncompromising precision in execution or examination.',
        example: 'The master watchmaker was celebrated for his fastidious attention to detail.',
        register: 'Critical Review / High-end Craft'
      },
      {
        id: 'chunk_fast_2',
        text: 'a fastidious researcher',
        meaning: 'A scholar who cross-checks primary sources meticulously before publishing.',
        example: 'As a fastidious researcher, she verified every citation against ancient manuscripts.',
        register: 'Academic'
      }
    ],
    examples: [
      {
        sentence: 'His fastidious culinary standards meant that even slightly bruised produce was rejected.',
        sourceType: 'Biography'
      },
      {
        sentence: 'The lead auditor brought a fastidious eye to the forensic accounting report.',
        sourceType: 'Corporate Law Review'
      }
    ],
    synonyms: [
      {
        word: 'meticulous',
        nuanceDiff: 'Meticulous focuses purely on careful thoroughness; fastidious adds a layer of selective taste and high personal standards.'
      },
      {
        word: 'punctilious',
        nuanceDiff: 'Punctilious specifically refers to rigid adherence to etiquette, formal codes, or protocol.'
      }
    ],
    antonyms: ['sloppy', 'careless', 'undemanding', 'lax'],
    variants: [
      {
        id: 'var_fast_word2meaning',
        type: 'word_to_meaning',
        testedDimension: 'meaning_recall',
        prompt: 'fastidious',
        subPrompt: 'adjective • /fæˈstɪd.i.əs/',
        targetAnswer: 'Very attentive to and concerned about accuracy and detail; having demanding standards.',
        explanation: 'From Latin for loathing disorder; denotes exacting precision and fastidious refinement.'
      },
      {
        id: 'var_fast_chunk',
        type: 'chunk_completion',
        testedDimension: 'chunks_collocations',
        prompt: '_____ attention to detail',
        subPrompt: 'Complete the prestigious collocation meaning "scrupulous accuracy"',
        targetAnswer: 'fastidious',
        hint: 'Starts with "fast-".',
        explanation: '"fastidious attention to detail" is an essential rhetorical collocation.'
      },
      {
        id: 'var_fast_meaning2word',
        type: 'meaning_to_word',
        testedDimension: 'active_production',
        prompt: 'Excessively particular, demanding, or showing rigorous concern for cleanliness and accuracy (starts with f-)',
        subPrompt: '10 letters • Adjective',
        targetAnswer: 'fastidious',
        hint: 'Begins with "fasti-".',
        explanation: 'Fastidious captures both perfectionist precision and demanding taste.'
      }
    ],
    fsrs: {
      ...createInitialFSRSState(),
      due: dueNow,
      state: State.New,
    },
    dimensionsMastery: {
      meaning_recall: 40,
      contextual_usage: 30,
      chunks_collocations: 25,
      nuance_distinction: 30,
      active_production: 20,
    },
    variantStats: {},
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 6,
  }
];
