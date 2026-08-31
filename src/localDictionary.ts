export interface DictionaryEntry {
  definition: string;
  synonyms: string[];
}

export const LOCAL_DICTIONARY: Record<string, DictionaryEntry> = {
  dragon: {
    definition: "A mythical, giant lizard-like creature that can fly and breathe fire.",
    synonyms: ["beast", "monster", "drake"]
  },
  forest: {
    definition: "A large area covered chiefly with trees and plants where wild animals live.",
    synonyms: ["woods", "jungle", "grove"]
  },
  sprint: {
    definition: "To run very, very fast for a short distance.",
    synonyms: ["dash", "rush", "bolt", "race"]
  },
  magic: {
    definition: "Special powers that make wonderful and mysterious things happen.",
    synonyms: ["sorcery", "wizardry", "enchantment", "charm"]
  },
  sparkle: {
    definition: "To shine brightly with small flashes of light.",
    synonyms: ["shine", "glimmer", "glitter", "twinkle"]
  },
  happy: {
    definition: "Feeling or showing pleasure, joy, and satisfaction.",
    synonyms: ["joyful", "glad", "cheerful", "delighted"]
  },
  brave: {
    definition: "Ready to face danger or pain without showing fear.",
    synonyms: ["courageous", "bold", "fearless", "valiant"]
  },
  friend: {
    definition: "Someone you like, trust, and enjoy spending time with.",
    synonyms: ["buddy", "pal", "companion", "mate"]
  },
  explore: {
    definition: "To travel through an unfamiliar area to learn about it.",
    synonyms: ["discover", "search", "investigate", "travel"]
  },
  castle: {
    definition: "A large, strong building built in the past by kings or queens to protect against enemies.",
    synonyms: ["fortress", "palace", "manor", "keep"]
  },
  treasure: {
    definition: "A collection of valuable things like gold, silver, jewels, or money.",
    synonyms: ["riches", "wealth", "booty", "fortune"]
  },
  giggle: {
    definition: "To laugh in a silly, high-pitched way because you are amused or nervous.",
    synonyms: ["snicker", "titter", "chuckle", "laugh"]
  },
  climb: {
    definition: "To go upward using your hands and feet, like going up a hill, tree, or ladder.",
    synonyms: ["scale", "ascend", "mount"]
  },
  dream: {
    definition: "Thoughts, images, or stories that happen in your mind while you sleep, or a hope for the future.",
    synonyms: ["fancy", "wish", "vision", "hope"]
  },
  whisper: {
    definition: "To speak very softly using your breath instead of your voice, so others cannot hear.",
    synonyms: ["murmur", "mumble", "hiss"]
  },
  shimmer: {
    definition: "To shine with a soft, tremulous, or wavering light.",
    synonyms: ["gleam", "glimmer", "sparkle", "glisten"]
  },
  giant: {
    definition: "An imaginary creature that looks like a human but is incredibly large and strong.",
    synonyms: ["huge", "colossal", "gigantic", "enormous"]
  },
  scared: {
    definition: "Feeling fear or worry; afraid of something.",
    synonyms: ["frightened", "afraid", "terrified", "spooked"]
  },
  adventure: {
    definition: "An exciting, unusual, and sometimes risky experience or journey.",
    synonyms: ["quest", "expedition", "journey", "trip"]
  },
  kind: {
    definition: "Being warm, friendly, generous, and showing care for others.",
    synonyms: ["nice", "caring", "gentle", "helpful"]
  },
  sad: {
    definition: "Feeling unhappy, sorrowful, or down in the dumps.",
    synonyms: ["unhappy", "gloomy", "blue", "downcast"]
  },
  angry: {
    definition: "Feeling strong displeasure or rage about something.",
    synonyms: ["mad", "furious", "cross", "annoyed"]
  },
  smart: {
    definition: "Quick-witted, intelligent, or good at learning things.",
    synonyms: ["intelligent", "clever", "wise", "bright"]
  },
  quiet: {
    definition: "Making very little or no noise; peaceful and silent.",
    synonyms: ["silent", "still", "calm", "peaceful"]
  },
  loud: {
    definition: "Making a lot of noise; easily heard.",
    synonyms: ["noisy", "boisterous", "deafening", "rowdy"]
  },
  help: {
    definition: "To make it easier for someone to do something by giving support or aid.",
    synonyms: ["assist", "aid", "support", "lend a hand"]
  },
  learn: {
    definition: "To get knowledge or skill in a new subject or activity.",
    synonyms: ["study", "understand", "grasp"]
  },
  play: {
    definition: "To do activities for fun, amusement, and enjoyment rather than work.",
    synonyms: ["frolic", "romp", "have fun"]
  },
  sing: {
    definition: "To make musical sounds with your voice.",
    synonyms: ["chant", "hum", "carol"]
  },
  sleep: {
    definition: "To rest your mind and body, usually at night with your eyes closed.",
    synonyms: ["doze", "slumber", "nap"]
  },
  walk: {
    definition: "To move forward on foot by taking steps.",
    synonyms: ["stroll", "march", "wander", "hike"]
  },
  see: {
    definition: "To look at something with your eyes.",
    synonyms: ["view", "look", "observe", "watch"]
  },
  hear: {
    definition: "To listen to sound using your ears.",
    synonyms: ["listen", "hearken"]
  },
  feel: {
    definition: "To experience a sensation through touch, or an emotion in your heart.",
    synonyms: ["touch", "sense", "experience"]
  },
  love: {
    definition: "A very strong feeling of liking and caring for someone or something.",
    synonyms: ["adore", "cherish", "care for"]
  },
  animal: {
    definition: "A living creature that can move around, breathe, and eat food.",
    synonyms: ["beast", "creature", "critter"]
  },
  tree: {
    definition: "A tall plant with a woody trunk, branches, and leaves that lives for many years.",
    synonyms: ["sapling", "timber"]
  },
  flower: {
    definition: "The colorful part of a plant that makes seeds and often smells sweet.",
    synonyms: ["bloom", "blossom"]
  },
  river: {
    definition: "A large natural stream of water flowing in a channel to the sea or a lake.",
    synonyms: ["stream", "creek", "brook"]
  },
  ocean: {
    definition: "The very large body of salty water that covers most of the Earth.",
    synonyms: ["sea", "deep"]
  },
  cave: {
    definition: "A large natural hole in the side of a hill, mountain, or underground.",
    synonyms: ["cavern", "grotto"]
  },
  sky: {
    definition: "The space above the earth where you see clouds, the sun, moon, and stars.",
    synonyms: ["heavens", "firmament"]
  },
  sun: {
    definition: "The bright star that lights up the earth during the day and keeps us warm.",
    synonyms: ["daystar"]
  },
  moon: {
    definition: "The round object that shines in the sky at night and travels around the Earth.",
    synonyms: ["luna"]
  },
  star: {
    definition: "A tiny glowing point of light in the night sky, which is actually a giant burning ball of gas far away.",
    synonyms: ["twinkler"]
  },
  wind: {
    definition: "Air that moves quickly across the land.",
    synonyms: ["breeze", "gust", "gale"]
  },
  rain: {
    definition: "Water falling in drops from clouds in the sky.",
    synonyms: ["shower", "drizzle", "downpour"]
  },
  snow: {
    definition: "Soft, white flakes of frozen water that fall from the sky when it is cold.",
    synonyms: ["flurry", "powder"]
  },
  fire: {
    definition: "Bright, hot flames produced by burning wood, coal, or paper.",
    synonyms: ["blaze", "flames", "ember"]
  },
  water: {
    definition: "The clear liquid that falls as rain, makes up rivers and oceans, and is needed for drinking.",
    synonyms: ["liquid", "h2o"]
  },
  stone: {
    definition: "A hard, solid piece of rock.",
    synonyms: ["rock", "pebble", "boulder"]
  },
  mountain: {
    definition: "A very high hill, often with steep rocky sides.",
    synonyms: ["peak", "mount", "summit"]
  },
  jungle: {
    definition: "A thick, tropical forest filled with plants, trees, and wild animals.",
    synonyms: ["rainforest", "wilds"]
  },
  desert: {
    definition: "A very dry, sandy area of land with very little water and few plants.",
    synonyms: ["wasteland", "dunes"]
  },
  wizard: {
    definition: "An imaginary man in stories who has magical powers.",
    synonyms: ["magician", "sorcerer", "mage"]
  },
  witch: {
    definition: "An imaginary woman in stories who has magical powers.",
    synonyms: ["sorceress", "enchantress"]
  },
  fairy: {
    definition: "A small, magical creature in stories that has wings and can fly.",
    synonyms: ["pixie", "sprite", "elf"]
  },
  elf: {
    definition: "A small, mischievous fairy-like creature with pointed ears.",
    synonyms: ["sprite", "pixie", "goblin"]
  },
  monster: {
    definition: "An imaginary creature that is scary, ugly, or strange.",
    synonyms: ["beast", "creature", "fiend"]
  },
  dinosaur: {
    definition: "An ancient, giant reptile that lived millions of years ago and is now extinct.",
    synonyms: ["beast", "reptile"]
  },
  superhero: {
    definition: "A character in stories who has amazing, magical powers and saves people from danger.",
    synonyms: ["hero", "champion"]
  },
  fly: {
    definition: "To move through the air using wings, or like a bird.",
    synonyms: ["soar", "glide", "hover"]
  },
  jump: {
    definition: "To push yourself up into the air using your legs.",
    synonyms: ["leap", "bound", "hop"]
  },
  run: {
    definition: "To move on foot faster than walking, taking quick steps.",
    synonyms: ["dash", "sprint", "jog"]
  },
  swift: {
    definition: "Moving or capable of moving with great speed.",
    synonyms: ["fast", "quick", "rapid", "fleet"]
  },
  glow: {
    definition: "To shine with a steady, soft light without a flame.",
    synonyms: ["shine", "beam", "radiate"]
  },
  mysterious: {
    definition: "Strange, secret, or difficult to understand or explain.",
    synonyms: ["secretiveAddress", "weird", "strange", "puzzle"]
  },
  hidden: {
    definition: "Placed out of sight; secret and hard to find.",
    synonyms: ["concealed", "secret", "buried", "camouflaged"]
  },
  solve: {
    definition: "To find an answer or explanation for a puzzle or problem.",
    synonyms: ["resolve", "crack", "figure out"]
  },
  riddle: {
    definition: "A fun word puzzle or question that requires clever thinking to answer.",
    synonyms: ["puzzle", "brainteaser", "conundrum"]
  },
  whisperer: {
    definition: "Someone who has a special talent for speaking quietly to and understanding animals.",
    synonyms: ["communicator"]
  },
  ancient: {
    definition: "Very, very old; belonging to times long ago.",
    synonyms: ["antique", "aged", "olden"]
  },
  cheerful: {
    definition: "Full of happiness and good spirits; bright and pleasant.",
    synonyms: ["happy", "sunny", "joyful", "glad"]
  },
  courageous: {
    definition: "Brave; ready to face scary things with strength.",
    synonyms: ["brave", "valiant", "bold"]
  },
  furious: {
    definition: "Extremely angry; full of rage.",
    synonyms: ["angry", "mad", "livid", "raging"]
  },
  generous: {
    definition: "Happy to share your toys, food, or time with others.",
    synonyms: ["giving", "kind", "unselfish"]
  },
  honest: {
    definition: "Telling the truth and not lying or stealing.",
    synonyms: ["truthful", "sincere", "trustworthy"]
  },
  polite: {
    definition: "Having good manners and showing respect to others.",
    synonyms: ["courteous", "respectful", "civil"]
  },
  rude: {
    definition: "Not polite; showing bad manners or disrespect.",
    synonyms: ["impolite", "discourteous", "mean"]
  },
  sleepy: {
    definition: "Feeling ready to sleep; tired.",
    synonyms: ["tired", "drowsy", "weary"]
  },
  hungry: {
    definition: "Feeling like you need to eat food.",
    synonyms: ["starving", "famished", "peckish"]
  },
  thirsty: {
    definition: "Feeling like you need to drink water.",
    synonyms: ["parched", "dry"]
  },
  tiny: {
    definition: "Extremely small in size.",
    synonyms: ["small", "miniature", "microscopic", "wee"]
  },
  huge: {
    definition: "Extremely large in size.",
    synonyms: ["giant", "enormous", "colossal", "gigantic"]
  },
  beautiful: {
    definition: "Very pretty to look at or lovely to listen to.",
    synonyms: ["pretty", "lovely", "gorgeous", "handsome"]
  },
  ugly: {
    definition: "Not pleasant to look at.",
    synonyms: ["unattractive", "plain", "unsightly"]
  },
  fluffy: {
    definition: "Very soft and light, like cotton, wool, or feathers.",
    synonyms: ["soft", "furry", "downy", "feathery"]
  },
  slither: {
    definition: "To slide along the ground smoothly, like a snake.",
    synonyms: ["slide", "glide", "crawl"]
  },
  growl: {
    definition: "To make a low, rumbling, angry sound in the throat, like a dog.",
    synonyms: ["snarl", "rumble", "grunt"]
  },
  chirp: {
    definition: "To make a short, sharp, cheerful high sound, like a baby bird.",
    synonyms: ["peepAddress", "twitter", "cheep"]
  },
  bounce: {
    definition: "To spring back quickly after hitting a surface, like a rubber ball.",
    synonyms: ["spring", "boundAddress", "rebound"]
  },
  float: {
    definition: "To stay on top of water or move slowly through the air.",
    synonyms: ["drift", "hover", "glide"]
  },
  sink: {
    definition: "To go down beneath the surface of water or ground.",
    synonyms: ["submerge", "go down", "descend"]
  },
  melt: {
    definition: "To turn from a solid into a liquid because of heat, like ice turning to water.",
    synonyms: ["dissolveAddress", "liquefy", "thaw"]
  },
  freeze: {
    definition: "To turn from a liquid into a solid because of cold, like water turning to ice.",
    synonyms: ["solidifyAddress", "harden", "chill"]
  },
  grow: {
    definition: "To get bigger, taller, or develop over time.",
    synonyms: ["develop", "expand", "sprout", "mature"]
  },
  shrink: {
    definition: "To become smaller in size.",
    synonyms: ["decrease", "diminish", "dwindle"]
  },
  build: {
    definition: "To make something by putting pieces together, like building a tower of blocks.",
    synonyms: ["construct", "create", "make", "assemble"]
  },
  destroy: {
    definition: "To damage something so badly that it cannot be fixed or used.",
    synonyms: ["ruin", "wreck", "smash", "demolish"]
  },
  discover: {
    definition: "To find something that was hidden or that you did not know about before.",
    synonyms: ["find", "unearth", "reveal", "locate"]
  },
  teach: {
    definition: "To help someone learn how to do something or understand a subject.",
    synonyms: ["instruct", "guide", "train", "tutor"]
  },
  create: {
    definition: "To bring something new into existence; to make art or invent a story.",
    synonyms: ["invent", "make", "produce", "generate"]
  }
};

export function lookupLocally(text: string): DictionaryEntry | null {
  const word = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
  if (!word) return null;

  // 1. Direct Match
  if (LOCAL_DICTIONARY[word]) {
    return LOCAL_DICTIONARY[word];
  }

  // 2. Stemming suffixes
  let stemmed = word;

  // Plural 's' / 'es'
  if (word.endsWith('s') && !word.endsWith('ss')) {
    if (word.endsWith('es')) {
      stemmed = word.slice(0, -2);
      if (LOCAL_DICTIONARY[stemmed]) return LOCAL_DICTIONARY[stemmed];
    }
    stemmed = word.slice(0, -1);
    if (LOCAL_DICTIONARY[stemmed]) return LOCAL_DICTIONARY[stemmed];
  }

  // Past tense 'ed'
  if (word.endsWith('ed')) {
    // e.g., sprinted -> sprint
    stemmed = word.slice(0, -2);
    if (LOCAL_DICTIONARY[stemmed]) return LOCAL_DICTIONARY[stemmed];
    // e.g., loved -> love
    stemmed = word.slice(0, -1);
    if (LOCAL_DICTIONARY[stemmed]) return LOCAL_DICTIONARY[stemmed];
  }

  // Present continuous 'ing'
  if (word.endsWith('ing')) {
    // e.g., singing -> sing
    stemmed = word.slice(0, -3);
    if (LOCAL_DICTIONARY[stemmed]) return LOCAL_DICTIONARY[stemmed];
    // e.g., exploring -> explore
    stemmed = word.slice(0, -3) + 'e';
    if (LOCAL_DICTIONARY[stemmed]) return LOCAL_DICTIONARY[stemmed];
  }

  // Adverb 'ly'
  if (word.endsWith('ly')) {
    // e.g., cheerfully -> cheerful
    stemmed = word.slice(0, -2);
    if (LOCAL_DICTIONARY[stemmed]) return LOCAL_DICTIONARY[stemmed];
  }

  return null;
}
