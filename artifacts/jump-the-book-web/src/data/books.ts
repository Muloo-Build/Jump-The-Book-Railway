import aliceCover from "@/assets/covers/alice.png";
import draculaCover from "@/assets/covers/dracula.png";
import frankensteinCover from "@/assets/covers/frankenstein.png";
import sherlockCover from "@/assets/covers/sherlock.png";

export type VisualStyle =
  | "comic-book"
  | "watercolour"
  | "dark-cinematic"
  | "animated-storybook"
  | "manga-inspired"
  | "fantasy-illustration";

export const VISUAL_STYLE_LABELS: Record<VisualStyle, string> = {
  "comic-book": "Comic Book",
  watercolour: "Watercolour",
  "dark-cinematic": "Dark Cinematic",
  "animated-storybook": "Animated Storybook",
  "manga-inspired": "Manga Inspired",
  "fantasy-illustration": "Fantasy Illustration",
};

export type SpoilerMode = "no-spoilers" | "light-guidance" | "full-companion";

export const SPOILER_MODE_LABELS: Record<SpoilerMode, string> = {
  "no-spoilers": "No Spoilers",
  "light-guidance": "Light Guidance",
  "full-companion": "Full Chapter Companion",
};

export interface Scene {
  id: string;
  chapterId: string;
  title: string;
  summary: string;
  characters: string[];
  location: string;
  mood: string;
  imagePrompt: string;
  narration: string;
  gradientColors: string[];
}

/**
 * Pre-baked AI scene art for demo books. Keys are scene ids.
 * Files live in /public/scenes/ and are served as static assets.
 * Missing entries fall back to gradient backgrounds.
 */
function scene(name: string): string {
  return `${import.meta.env.BASE_URL}scenes/${name}`;
}

export const SCENE_IMAGES: Record<string, string> = {
  "alice-ch1-s1": scene("alice-ch1-s1.png"),
  "alice-ch1-s2": scene("alice-ch1-s2.png"),
  "alice-ch1-s3": scene("alice-ch1-s3.png"),
  "alice-ch1-s4": scene("alice-ch1-s4.png"),
  "alice-ch1-s5": scene("alice-ch1-s5.png"),
  "alice-ch1-s6": scene("alice-ch1-s6.png"),
  "dracula-ch1-s1": scene("dracula-ch1-s1.png"),
  "dracula-ch1-s2": scene("dracula-ch1-s2.png"),
  "dracula-ch1-s3": scene("dracula-ch1-s3.png"),
  "frank-ch1-s1": scene("frank-ch1-s1.png"),
  "frank-ch1-s2": scene("frank-ch1-s2.png"),
  "frank-ch1-s3": scene("frank-ch1-s3.png"),
  "sherlock-ch1-s1": scene("sherlock-ch1-s1.png"),
  "sherlock-ch1-s2": scene("sherlock-ch1-s2.png"),
  "sherlock-ch1-s3": scene("sherlock-ch1-s3.png"),
};

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  chapterNumber: number;
  summary: string;
  scenes: Scene[];
}

export interface Character {
  id: string;
  bookId: string;
  name: string;
  role: string;
  description: string;
  firstAppearance: string;
  currentStatus: string;
  relationshipNotes: string;
  visualDescription: string;
  gradientColors: string[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  sourceType: "demo" | "user-added" | "user-writing";
  format: string;
  publicDomain: boolean;
  coverGradient: string[];
  progress: number;
  currentChapter: number;
  visualStyle: VisualStyle;
  tagline: string;
  heroImage?: string;
  // Optional resolved cover URL for demo books — lets us hardcode a real
  // Open Library cover so the Classics row is instant on first paint.
  coverUrl?: string | null;
}

export interface UserLibraryItem {
  id: string;
  title: string;
  author: string;
  format: string;
  currentChapter: number;
  currentPage: number;
  currentAudioTimestamp: string;
  spoilerMode: SpoilerMode;
  userNote: string;
  visualStyle: VisualStyle;
  progress: number;
  coverGradient: string[];
  createdAt: string;
  // Optional fields shared with demo Book so screens can render either uniformly
  sourceType?: "demo" | "user-added" | "user-writing";
  tagline?: string;
  heroImage?: string;
  // Resolved cover URL (Open Library or any CDN). When present, the tile
  // renders this directly and skips the per-browser OL lookup.
  coverUrl?: string | null;
  // Backend user_books.id (UUID). Present for remote-backed items (signed-in
  // users); local/demo items use slug ids and have no remote id yet.
  remoteId?: string;
}

export const DEMO_BOOKS: Book[] = [
  {
    id: "alice",
    title: "Alice in Wonderland",
    author: "Lewis Carroll",
    sourceType: "demo",
    format: "Classic",
    publicDomain: true,
    coverGradient: ["#1a1a4e", "#4a1a6e", "#8b5cf6"],
    progress: 0,
    currentChapter: 1,
    visualStyle: "fantasy-illustration",
    tagline: "A journey through the impossible.",
    coverUrl: aliceCover,
  },
  {
    id: "dracula",
    title: "Dracula",
    author: "Bram Stoker",
    sourceType: "demo",
    format: "Classic",
    publicDomain: true,
    coverGradient: ["#1a0a0a", "#4a0a0a", "#8b0000"],
    progress: 0,
    currentChapter: 1,
    visualStyle: "dark-cinematic",
    tagline: "Evil has a new face.",
    coverUrl: draculaCover,
  },
  {
    id: "frankenstein",
    title: "Frankenstein",
    author: "Mary Shelley",
    sourceType: "demo",
    format: "Classic",
    publicDomain: true,
    coverGradient: ["#0a1a1a", "#1a3a3a", "#2a6a4a"],
    progress: 0,
    currentChapter: 1,
    visualStyle: "dark-cinematic",
    tagline: "The birth of the unnatural.",
    coverUrl: frankensteinCover,
  },
  {
    id: "sherlock",
    title: "The Adventures of Sherlock Holmes",
    author: "Arthur Conan Doyle",
    sourceType: "demo",
    format: "Classic",
    publicDomain: true,
    coverGradient: ["#1a1208", "#3a2808", "#7a5a18"],
    progress: 0,
    currentChapter: 1,
    visualStyle: "animated-storybook",
    tagline: "Elementary, my dear reader.",
    coverUrl: sherlockCover,
  },
];

export const CHAPTERS: Record<string, Chapter[]> = {
  alice: [
    {
      id: "alice-ch1",
      bookId: "alice",
      title: "Down the Rabbit Hole",
      chapterNumber: 1,
      summary:
        "Alice follows a mysterious White Rabbit down a hole and begins her impossible journey into Wonderland.",
      scenes: [
        {
          id: "alice-ch1-s1",
          chapterId: "alice-ch1",
          title: "Alice spots the White Rabbit",
          summary:
            "Alice sits bored beside her sister when a nervous White Rabbit rushes past, checking his watch and muttering that he is late.",
          characters: ["Alice", "White Rabbit"],
          location: "Riverbank",
          mood: "Curious, strange, dreamlike",
          imagePrompt:
            "A cinematic storybook illustration of a young girl noticing a white rabbit in a waistcoat checking a pocket watch beside a quiet riverbank, magical atmosphere, soft golden light, whimsical details.",
          narration:
            "On the warm afternoon bank, Alice's idle daydream was shattered by the hurried flash of white fur and the glint of a pocket watch.",
          gradientColors: ["#1a1a4e", "#4a1a6e", "#c9974a"],
        },
        {
          id: "alice-ch1-s2",
          chapterId: "alice-ch1",
          title: "Alice follows the Rabbit",
          summary:
            "Alice follows the rabbit across the field and reaches the rabbit hole, her curiosity pulling her into the unknown.",
          characters: ["Alice", "White Rabbit"],
          location: "Field and rabbit hole",
          mood: "Curious, adventurous, mysterious",
          imagePrompt:
            "A whimsical fantasy scene of a young girl chasing a white rabbit toward a dark rabbit hole under twisted roots, cinematic composition, magical storybook style.",
          narration:
            "Without a second thought, Alice leapt to her feet. The rabbit was always just ahead, always just out of reach.",
          gradientColors: ["#0f0f3a", "#2a1a5e", "#8b5cf6"],
        },
        {
          id: "alice-ch1-s3",
          chapterId: "alice-ch1",
          title: "Alice falls down the rabbit hole",
          summary:
            "Alice tumbles slowly through a deep rabbit hole filled with cupboards, books, maps and impossible objects floating around her.",
          characters: ["Alice"],
          location: "Rabbit hole",
          mood: "Surreal, floating, magical",
          imagePrompt:
            "A surreal vertical tunnel filled with floating books, jars, maps and furniture as a young girl falls slowly through glowing darkness, cinematic fantasy illustration.",
          narration:
            "She fell — but not quickly. Strange shelves lined the walls. Jars of marmalade. A map of places that shouldn't exist.",
          gradientColors: ["#08083a", "#1a0a4e", "#6d28d9"],
        },
        {
          id: "alice-ch1-s4",
          chapterId: "alice-ch1",
          title: "Alice lands in the strange hall",
          summary:
            "Alice lands safely in a hall full of locked doors and begins searching for a way into the beautiful garden.",
          characters: ["Alice"],
          location: "Hall of doors",
          mood: "Mysterious, quiet, puzzling",
          imagePrompt:
            "A magical hallway lined with many tiny locked doors, a young girl standing in wonder beneath warm lantern light, dreamlike cinematic storybook style.",
          narration:
            "The landing was soft, the light was amber, and every door was locked. Somewhere beyond them, a garden waited.",
          gradientColors: ["#1a1208", "#3a2808", "#c9974a"],
        },
        {
          id: "alice-ch1-s5",
          chapterId: "alice-ch1",
          title: "Alice finds the tiny door",
          summary:
            "Alice discovers a tiny golden key and a small door leading to a beautiful garden, but she is too large to enter.",
          characters: ["Alice"],
          location: "Hall of doors",
          mood: "Wonder, frustration, enchantment",
          imagePrompt:
            "A young girl kneeling beside a tiny glowing door that opens into a beautiful garden, golden key on a glass table, magical cinematic lighting.",
          narration:
            "The key was gold and perfect. The door was exquisite. And Alice was far, far too large.",
          gradientColors: ["#1a1a0a", "#4a3a08", "#c9974a"],
        },
        {
          id: "alice-ch1-s6",
          chapterId: "alice-ch1",
          title: "Alice drinks from the bottle",
          summary:
            "Alice finds a mysterious bottle labelled 'Drink Me' and drinks it, beginning her strange transformation.",
          characters: ["Alice"],
          location: "Hall of doors",
          mood: "Magical, risky, playful",
          imagePrompt:
            "A mysterious glass bottle labelled Drink Me sitting on a small table in a magical hallway, a curious young girl reaching toward it, whimsical fantasy illustration.",
          narration:
            "The label said only two words. And Alice, sensibly or not, decided to trust them.",
          gradientColors: ["#0a1a1a", "#1a4a3a", "#4ade80"],
        },
      ],
    },
    {
      id: "alice-ch2",
      bookId: "alice",
      title: "The Pool of Tears",
      chapterNumber: 2,
      summary:
        "A shrunken Alice weeps a pool of tears, then grows enormous again, and eventually swims to shore with a strange collection of creatures.",
      scenes: [
        {
          id: "alice-ch2-s1",
          chapterId: "alice-ch2",
          title: "Alice shrinks",
          summary:
            "The drink works its magic and Alice shrinks to just ten inches tall.",
          characters: ["Alice"],
          location: "Hall of doors",
          mood: "Disorienting, thrilling",
          imagePrompt:
            "A tiny Alice standing before a now enormous door, dwarfed by the hall around her, cinematic storybook fantasy.",
          narration: "The world grew large around her. Or perhaps she grew small.",
          gradientColors: ["#1a1a4e", "#3a1a6e", "#9d7fe8"],
        },
        {
          id: "alice-ch2-s2",
          chapterId: "alice-ch2",
          title: "The pool of tears",
          summary: "Alice cries so much she creates a pool of tears.",
          characters: ["Alice", "Mouse"],
          location: "Pool of tears",
          mood: "Melancholy, surreal",
          imagePrompt:
            "A small girl swimming in a magical glowing pool of her own tears, ethereal light, fantastical creatures swimming alongside her.",
          narration:
            "She had cried so much, and now she was swimming in the evidence of her grief.",
          gradientColors: ["#0a1a3a", "#1a3a6e", "#60a5fa"],
        },
      ],
    },
    {
      id: "alice-ch3",
      bookId: "alice",
      title: "A Caucus-Race and a Long Tale",
      chapterNumber: 3,
      summary:
        "Alice meets a strange assembly of creatures who run a Caucus-race in circles to get dry, and listens to the Mouse's long sad tale.",
      scenes: [
        {
          id: "alice-ch3-s1",
          chapterId: "alice-ch3",
          title: "The Caucus-Race",
          summary:
            "Strange creatures run in circles, everyone wins, and prizes are handed out.",
          characters: ["Alice", "Dodo", "Mouse", "Duck"],
          location: "Riverbank",
          mood: "Absurd, cheerful, chaotic",
          imagePrompt:
            "A chaotic and joyful group of talking animals running in a circle on a riverbank, storybook illustration, bright and whimsical.",
          narration:
            "The race had no start, no finish, and everyone won. Wonderland logic in its purest form.",
          gradientColors: ["#1a2a1a", "#2a4a2a", "#4ade80"],
        },
      ],
    },
  ],
  dracula: [
    {
      id: "dracula-ch1",
      bookId: "dracula",
      title: "Jonathan Harker's Journal",
      chapterNumber: 1,
      summary:
        "Jonathan Harker travels to Transylvania on business, noting the strange customs and warnings from the locals.",
      scenes: [
        {
          id: "dracula-ch1-s1",
          chapterId: "dracula-ch1",
          title: "The journey to Transylvania",
          summary:
            "Jonathan travels by coach through the Carpathian mountains as locals warn him not to continue.",
          characters: ["Jonathan Harker"],
          location: "Carpathian Mountains",
          mood: "Foreboding, mysterious",
          imagePrompt:
            "A horse-drawn coach traveling through dark Carpathian mountain roads at dusk, dramatic shadows and stormy skies, gothic atmosphere.",
          narration:
            "The mountain road twisted into darkness. Every local he'd met had pressed a crucifix into his hands.",
          gradientColors: ["#1a0a0a", "#3a0a0a", "#8b0000"],
        },
        {
          id: "dracula-ch1-s2",
          chapterId: "dracula-ch1",
          title: "Arrival at Castle Dracula",
          summary:
            "Jonathan arrives at the vast and ancient castle as a mysterious figure emerges to welcome him.",
          characters: ["Jonathan Harker", "Count Dracula"],
          location: "Castle Dracula",
          mood: "Dread, gothic grandeur",
          imagePrompt:
            "A young man arriving at the massive gates of a gothic castle at night, a tall cloaked figure waiting in the doorway, blood red moon overhead.",
          narration:
            "The Count's grip was cold as stone. His smile never reached his eyes.",
          gradientColors: ["#0a0a1a", "#2a0a2a", "#6b0000"],
        },
        {
          id: "dracula-ch1-s3",
          chapterId: "dracula-ch1",
          title: "Trapped in the castle",
          summary:
            "Jonathan realizes the castle is a prison and he is the prisoner.",
          characters: ["Jonathan Harker"],
          location: "Castle Dracula",
          mood: "Trapped, terrified",
          imagePrompt:
            "A young man peering through a barred window of a gothic castle, desperation in his face, dark mountains below, moonlit night.",
          narration:
            "Every door was locked. Every window a sheer drop. He was not a guest. He was prey.",
          gradientColors: ["#08080a", "#1a0a1a", "#4a0000"],
        },
      ],
    },
    {
      id: "dracula-ch2",
      bookId: "dracula",
      title: "Mina's Journal",
      chapterNumber: 2,
      summary:
        "Mina Murray writes letters to her friend Lucy while waiting anxiously for news of Jonathan.",
      scenes: [
        {
          id: "dracula-ch2-s1",
          chapterId: "dracula-ch2",
          title: "Mina's letters",
          summary:
            "Mina writes from Whitby, worried about Jonathan's long silence.",
          characters: ["Mina Murray", "Lucy Westenra"],
          location: "Whitby, England",
          mood: "Anxious, longing",
          imagePrompt:
            "A young woman writing by candlelight beside a window overlooking a moonlit sea, gothic romantic atmosphere.",
          narration:
            "His letters had stopped. She wrote to him every day and received nothing in return.",
          gradientColors: ["#0a0a1a", "#1a1a3a", "#9d7fe8"],
        },
      ],
    },
  ],
  frankenstein: [
    {
      id: "frank-ch1",
      bookId: "frankenstein",
      title: "The Creation",
      chapterNumber: 1,
      summary:
        "Victor Frankenstein describes his obsessive work to animate dead matter, culminating in the terrifying success of his experiment.",
      scenes: [
        {
          id: "frank-ch1-s1",
          chapterId: "frank-ch1",
          title: "Victor's obsession",
          summary:
            "Victor becomes consumed by the dream of conquering death itself.",
          characters: ["Victor Frankenstein"],
          location: "University of Ingolstadt",
          mood: "Obsessive, driven, dangerous",
          imagePrompt:
            "A young scientist hunched over ancient books by candlelight, surrounded by bones and chemical equipment, Gothic laboratory atmosphere.",
          narration:
            "He had not slept in three days. He would not stop until death itself bent to his will.",
          gradientColors: ["#0a1a0a", "#1a3a1a", "#2a6a2a"],
        },
        {
          id: "frank-ch1-s2",
          chapterId: "frank-ch1",
          title: "The stormy laboratory",
          summary:
            "A stormy night. Victor assembles his creation and prepares the final experiment.",
          characters: ["Victor Frankenstein", "The Creature"],
          location: "Victor's laboratory",
          mood: "Tense, electric, terrifying",
          imagePrompt:
            "A dark laboratory filled with electrical equipment and lightning flashing through skylights, a large figure on a table covered in shadows.",
          narration:
            "Thunder rolled across the sky. Below, something that had never lived before was about to wake.",
          gradientColors: ["#0a0a0a", "#0a1a0a", "#4a9a4a"],
        },
        {
          id: "frank-ch1-s3",
          chapterId: "frank-ch1",
          title: "It's alive",
          summary:
            "The creature opens its yellow eyes for the first time. Victor is overwhelmed with horror at what he has made.",
          characters: ["Victor Frankenstein", "The Creature"],
          location: "Victor's laboratory",
          mood: "Horror, awe, revulsion",
          imagePrompt:
            "A terrified scientist backing away from a large shadowed figure sitting upright, yellow eyes glowing in the darkness, gothic dramatic lighting.",
          narration:
            "The eyes opened. Yellow and watery. It breathed. And Victor ran.",
          gradientColors: ["#0a0a08", "#1a1a08", "#6a6a08"],
        },
      ],
    },
    {
      id: "frank-ch2",
      bookId: "frankenstein",
      title: "The Creature Speaks",
      chapterNumber: 2,
      summary:
        "The creature confronts Victor and tells the story of his lonely existence since the night of his creation.",
      scenes: [
        {
          id: "frank-ch2-s1",
          chapterId: "frank-ch2",
          title: "Confrontation on the glacier",
          summary:
            "Victor meets the creature on a desolate mountain glacier, and is forced to listen.",
          characters: ["Victor Frankenstein", "The Creature"],
          location: "Mont Blanc glacier",
          mood: "Bleak, confrontational, tragic",
          imagePrompt:
            "Two figures on a vast frozen glacier, one enormous and shadowed, one human and small, surrounded by endless ice and stormy skies.",
          narration:
            "The creature was faster, stronger, and utterly alone. Victor had created a being who had every reason to hate him.",
          gradientColors: ["#0a1a2a", "#1a3a4a", "#60a5fa"],
        },
      ],
    },
  ],
  sherlock: [
    {
      id: "sherlock-ch1",
      bookId: "sherlock",
      title: "A Scandal in Bohemia",
      chapterNumber: 1,
      summary:
        "Holmes is hired by the King of Bohemia to retrieve a compromising photograph held by the brilliant Irene Adler.",
      scenes: [
        {
          id: "sherlock-ch1-s1",
          chapterId: "sherlock-ch1",
          title: "The mysterious client",
          summary:
            "A disguised client visits Baker Street to beg for Holmes's help in a delicate matter of state.",
          characters: ["Sherlock Holmes", "Dr. Watson", "The King of Bohemia"],
          location: "221B Baker Street",
          mood: "Intrigued, suspicious, sharp",
          imagePrompt:
            "A Victorian sitting room with a detective in armchair examining a visiting nobleman in disguise, gaslight and book-lined walls, sepia tone.",
          narration:
            "The disguise was good. Holmes saw through it immediately.",
          gradientColors: ["#1a1208", "#3a2808", "#c9974a"],
        },
        {
          id: "sherlock-ch1-s2",
          chapterId: "sherlock-ch1",
          title: "Irene Adler",
          summary:
            "Holmes investigates the formidable Irene Adler — the only person to have ever outwitted him.",
          characters: ["Sherlock Holmes", "Irene Adler"],
          location: "London streets",
          mood: "Tense, clever, electric",
          imagePrompt:
            "A Victorian woman in elegant dress walking confidently through foggy London streets at night, streetlamps glowing amber, a shadowed detective watching from a distance.",
          narration:
            "She was not his adversary. She was his equal. And that made all the difference.",
          gradientColors: ["#1a0a08", "#3a1a08", "#a05a18"],
        },
        {
          id: "sherlock-ch1-s3",
          chapterId: "sherlock-ch1",
          title: "The photograph",
          summary:
            "Holmes sets an elaborate ruse to discover where the photograph is hidden.",
          characters: ["Sherlock Holmes", "Dr. Watson", "Irene Adler"],
          location: "Irene Adler's home",
          mood: "Suspenseful, clever, cat-and-mouse",
          imagePrompt:
            "A disguised detective causing a commotion outside a Victorian townhouse while inside a woman clutches a hidden photograph, dramatic gaslight atmosphere.",
          narration:
            "Every move calculated. Every word a trap. And she walked into none of them.",
          gradientColors: ["#1a1208", "#2a2008", "#8a7a08"],
        },
      ],
    },
    {
      id: "sherlock-ch2",
      bookId: "sherlock",
      title: "The Red-Headed League",
      chapterNumber: 2,
      summary:
        "A peculiar client presents Holmes with a baffling story of an absurd yet sinister organisation for red-headed men.",
      scenes: [
        {
          id: "sherlock-ch2-s1",
          chapterId: "sherlock-ch2",
          title: "Mr. Wilson's strange tale",
          summary:
            "A pawnbroker with remarkable red hair tells Holmes about a lucrative but bizarre job offer.",
          characters: ["Sherlock Holmes", "Dr. Watson", "Jabez Wilson"],
          location: "221B Baker Street",
          mood: "Amused, curious, sharp",
          imagePrompt:
            "A red-haired Victorian gentleman sitting across from a sharp-eyed detective, animated in storytelling, cozy Baker Street interior.",
          narration:
            "Holmes steepled his fingers and listened. The stranger's story was absurd, which meant it was almost certainly serious.",
          gradientColors: ["#1a1008", "#3a2008", "#c05020"],
        },
      ],
    },
  ],
};

export const CHARACTERS: Record<string, Character[]> = {
  alice: [
    {
      id: "alice-char-alice",
      bookId: "alice",
      name: "Alice",
      role: "Protagonist",
      description:
        "A curious, brave, and imaginative young girl who tumbles into Wonderland.",
      firstAppearance: "Chapter 1",
      currentStatus: "Active",
      relationshipNotes: "Frequently challenged by the illogical world around her.",
      visualDescription:
        "Young girl in a blue dress with a white apron, long blonde hair, bright curious eyes.",
      gradientColors: ["#1a1a4e", "#4a1a6e", "#c9974a"],
    },
    {
      id: "alice-char-rabbit",
      bookId: "alice",
      name: "White Rabbit",
      role: "Inciting figure",
      description:
        "An anxious, waistcoat-wearing rabbit always late for an important date.",
      firstAppearance: "Chapter 1",
      currentStatus: "Active",
      relationshipNotes: "The catalyst for Alice's journey. Always in a hurry.",
      visualDescription:
        "White rabbit in a waistcoat and pocket watch, frantic expression, hurried movement.",
      gradientColors: ["#f0f0f0", "#d0d0d0", "#9d7fe8"],
    },
    {
      id: "alice-char-cheshire",
      bookId: "alice",
      name: "Cheshire Cat",
      role: "Mysterious guide",
      description:
        "A grinning cat who appears and disappears at will, offering cryptic but useful advice.",
      firstAppearance: "Chapter 6",
      currentStatus: "Active",
      relationshipNotes: "Friendly but unsettling. Arguably the sanest creature in Wonderland.",
      visualDescription:
        "Striped cat with an enormous grin, fading in and out of visibility, perched in trees.",
      gradientColors: ["#1a3a1a", "#2a6a2a", "#4ade80"],
    },
    {
      id: "alice-char-hatter",
      bookId: "alice",
      name: "Mad Hatter",
      role: "Eccentric host",
      description:
        "A perpetually tea-time-trapped hatter with delightful nonsense and sharp wit.",
      firstAppearance: "Chapter 7",
      currentStatus: "Active",
      relationshipNotes:
        "Host of the eternal tea party. Friend to Alice, enemy to time.",
      visualDescription:
        "Tall man in an oversized top hat, mismatched colourful clothes, wild eyes and a teacup.",
      gradientColors: ["#2a1a08", "#4a2a08", "#c9974a"],
    },
    {
      id: "alice-char-queen",
      bookId: "alice",
      name: "Queen of Hearts",
      role: "Antagonist",
      description: "The tyrannical, temperamental ruler of Wonderland.",
      firstAppearance: "Chapter 8",
      currentStatus: "Active",
      relationshipNotes:
        "Threatens everyone with decapitation. Surprisingly insecure.",
      visualDescription:
        "Imposing queen in red and black with a crown, playing card soldiers around her.",
      gradientColors: ["#3a0a0a", "#6a0a0a", "#ef4444"],
    },
  ],
  dracula: [
    {
      id: "dracula-char-dracula",
      bookId: "dracula",
      name: "Count Dracula",
      role: "Antagonist",
      description:
        "An ancient and powerful vampire Count who lives in a crumbling Transylvanian castle.",
      firstAppearance: "Chapter 1",
      currentStatus: "Active",
      relationshipNotes: "Prey: Jonathan Harker. Target: Mina Murray.",
      visualDescription:
        "Tall, pale, black-cloaked figure. Cold hands. No reflection. Eyes that burn red.",
      gradientColors: ["#1a0a0a", "#4a0a0a", "#8b0000"],
    },
    {
      id: "dracula-char-jonathan",
      bookId: "dracula",
      name: "Jonathan Harker",
      role: "Protagonist",
      description:
        "A young English solicitor sent to Transylvania on business, unaware of the danger.",
      firstAppearance: "Chapter 1",
      currentStatus: "Trapped",
      relationshipNotes: "Engaged to Mina Murray. Prisoner of Dracula.",
      visualDescription: "Young professional in Victorian dress, increasingly haggard.",
      gradientColors: ["#1a1a3a", "#2a2a5a", "#6060a0"],
    },
    {
      id: "dracula-char-mina",
      bookId: "dracula",
      name: "Mina Murray",
      role: "Central figure",
      description: "A clever, brave woman whose connection to Dracula becomes the key to defeating him.",
      firstAppearance: "Chapter 2",
      currentStatus: "Active",
      relationshipNotes: "Engaged to Jonathan. Target of Dracula's attention.",
      visualDescription: "Dark-haired Victorian woman, intelligent eyes, composed bearing.",
      gradientColors: ["#1a0a1a", "#3a1a3a", "#9d7fe8"],
    },
    {
      id: "dracula-char-vanhelsing",
      bookId: "dracula",
      name: "Professor Van Helsing",
      role: "Mentor/Hunter",
      description: "A Dutch doctor and expert in the supernatural who leads the fight against Dracula.",
      firstAppearance: "Chapter 9",
      currentStatus: "Active",
      relationshipNotes: "Friend and mentor to the group. The only one who truly understands the enemy.",
      visualDescription: "Older man with a white beard, commanding presence, always carrying unusual equipment.",
      gradientColors: ["#0a1a0a", "#1a3a1a", "#4ade80"],
    },
  ],
  frankenstein: [
    {
      id: "frank-char-victor",
      bookId: "frankenstein",
      name: "Victor Frankenstein",
      role: "Protagonist",
      description: "A brilliant but reckless scientist who plays God and pays the ultimate price.",
      firstAppearance: "Chapter 1",
      currentStatus: "Haunted",
      relationshipNotes: "Creator of the creature. Responsible for everything that follows.",
      visualDescription: "Intense young man, dark circles under his eyes, disheveled from long nights of work.",
      gradientColors: ["#0a1a0a", "#1a3a1a", "#2a6a2a"],
    },
    {
      id: "frank-char-creature",
      bookId: "frankenstein",
      name: "The Creature",
      role: "Antagonist/Victim",
      description: "A being of great intelligence and feeling, abandoned by his creator and made monstrous by loneliness.",
      firstAppearance: "Chapter 5",
      currentStatus: "Active",
      relationshipNotes: "Created by Victor. Rejected by humanity. Seeks only companionship.",
      visualDescription: "Eight feet tall, yellowish skin, flowing black hair, watery yellow eyes.",
      gradientColors: ["#0a0a0a", "#1a1a08", "#4a4a08"],
    },
    {
      id: "frank-char-elizabeth",
      bookId: "frankenstein",
      name: "Elizabeth Lavenza",
      role: "Supporting",
      description: "Victor's adopted sister and beloved, representing everything pure he stands to lose.",
      firstAppearance: "Chapter 1",
      currentStatus: "Active",
      relationshipNotes: "Victor's fiancée. In danger from the creature.",
      visualDescription: "Beautiful and gentle, fair-haired, with a warm and trusting nature.",
      gradientColors: ["#1a1a3a", "#3a3a6a", "#c9974a"],
    },
  ],
  sherlock: [
    {
      id: "sherlock-char-holmes",
      bookId: "sherlock",
      name: "Sherlock Holmes",
      role: "Protagonist",
      description: "The world's only consulting detective. Brilliant, eccentric, and always three steps ahead.",
      firstAppearance: "Chapter 1",
      currentStatus: "Active",
      relationshipNotes: "Partner to Watson. Adversary to criminals everywhere.",
      visualDescription: "Tall, lean man in a long coat. Hawk-like eyes. Often found with a pipe or violin.",
      gradientColors: ["#1a1208", "#3a2808", "#c9974a"],
    },
    {
      id: "sherlock-char-watson",
      bookId: "sherlock",
      name: "Dr. Watson",
      role: "Narrator/Companion",
      description: "A reliable, kind doctor and Holmes's steadfast companion and chronicler.",
      firstAppearance: "Chapter 1",
      currentStatus: "Active",
      relationshipNotes: "Holmes's best friend and biographer. More observant than he gets credit for.",
      visualDescription: "Military bearing, moustache, trustworthy face, always slightly in awe of Holmes.",
      gradientColors: ["#1a1a2a", "#2a2a4a", "#7a7ae8"],
    },
    {
      id: "sherlock-char-irene",
      bookId: "sherlock",
      name: "Irene Adler",
      role: "Antagonist/Foil",
      description: "An opera singer and the only person to ever outsmart Holmes. He calls her simply 'The Woman'.",
      firstAppearance: "Chapter 1",
      currentStatus: "Active",
      relationshipNotes: "Respected and admired by Holmes. The one who got away.",
      visualDescription: "Striking, confident woman of remarkable intelligence and beauty.",
      gradientColors: ["#2a0a1a", "#4a1a2a", "#c06080"],
    },
    {
      id: "sherlock-char-lestrade",
      bookId: "sherlock",
      name: "Inspector Lestrade",
      role: "Supporting",
      description: "A Scotland Yard inspector who often relies on Holmes while pretending otherwise.",
      firstAppearance: "Chapter 2",
      currentStatus: "Active",
      relationshipNotes: "Professional relationship with Holmes. Frequently humbled, rarely grateful.",
      visualDescription: "Compact, dark-complexioned official, sturdy but a little slow on the uptake.",
      gradientColors: ["#1a1a1a", "#3a3a3a", "#9a9a9a"],
    },
  ],
};
