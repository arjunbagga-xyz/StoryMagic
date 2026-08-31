// StoryMagic Demo Mode — a fully bundled, zero-key sample story.
//
// WHY THIS EXISTS
// ----------------
// StoryMagic needs an AI provider to generate a real story. For a public demo
// (and for anyone who just wants to *see* the app without wiring up API keys),
// we ship a beautiful pre-written sample so the whole experience — customizer,
// page-turn reading, dual-language text, and the tap-to-define dictionary — is
// explorable with NO network egress and NO API keys.
//
// PRIVACY / SAFETY NOTES
// ----------------------
// - Every illustration here is an inline SVG (a `data:` URI) generated at build
//   time. There are NO external image requests in demo mode — nothing leaves
//   the browser. This is also why the demo builds to a 100% static site.
// - The demo story text is hardcoded and child-safe. It contains words that
//   exist in `src/localDictionary.ts` (magic, sparkle, friend, ...) so the
//   tap-to-define feature works fully offline.

export interface DemoPage {
  text: string;
  translationText: string; // Hinglish (Romanized Hindi) translation for dual-language demo
  imagePrompt: string;
  svg: (() => string) | string; // builder fn or raw svg string
}

// ---- Inline SVG illustration builders (no network, no external assets) ----

function svgWrap(inner: string, bg = '#2a2350'): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600' preserveAspectRatio='xMidYMid slice'>
    <rect width='800' height='600' fill='${bg}'/>${inner}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// A lonely little star in a deep night sky, surrounded by faint distant stars.
function sceneLonelyStar(): string {
  let stars = '';
  const pts = [[80,90],[180,150],[300,70],[520,120],[690,80],[120,300],[610,260],[700,360],[240,420],[470,470],[140,520],[660,520]];
  for (const [x,y] of pts) stars += `<circle cx='${x}' cy='${y}' r='3' fill='#fff' opacity='0.5'/>`;
  const inner = `${stars}
    <g transform='translate(400,300)'>
      <circle r='70' fill='#3a3568'/>
      <path d='M0,-58 L14,-14 L58,-14 L22,12 L36,56 L0,30 L-36,56 L-22,12 L-58,-14 L-14,-14 Z' fill='#ffd76b' stroke='#fff3c4' stroke-width='3'/>
      <circle cx='-14' cy='-4' r='6' fill='#2a2350'/>
      <circle cx='16' cy='-4' r='6' fill='#2a2350'/>
      <path d='M-16,16 Q0,30 16,16' stroke='#2a2350' stroke-width='4' fill='none' stroke-linecap='round'/>
    </g>`;
  return svgWrap(inner, '#221d44');
}

// The little star meets a friendly smiling crescent moon.
function sceneMoon(): string {
  const stars = `<circle cx='120' cy='90' r='3' fill='#fff' opacity='0.6'/><circle cx='680' cy='140' r='3' fill='#fff' opacity='0.6'/><circle cx='220' cy='460' r='3' fill='#fff' opacity='0.5'/><circle cx='600' cy='500' r='3' fill='#fff' opacity='0.5'/>`;
  const inner = `${stars}
    <g transform='translate(540,300)'>
      <path d='M30,-90 A90,90 0 1 0 30,90 A70,70 0 1 1 30,-90 Z' fill='#f4e6a8' stroke='#fff' stroke-width='3'/>
      <circle cx='10' cy='-30' r='7' fill='#221d44'/>
      <circle cx='-18' cy='-28' r='7' fill='#221d44'/>
      <path d='M-34,10 Q-10,30 8,12' stroke='#221d44' stroke-width='4' fill='none' stroke-linecap='round'/>
    </g>
    <g transform='translate(300,300)'>
      <circle r='52' fill='#3a3568'/>
      <path d='M0,-44 L11,-10 L44,-10 L16,9 L27,42 L0,22 L-27,42 L-16,9 L-44,-10 L-11,-10 Z' fill='#ffd76b' stroke='#fff3c4' stroke-width='3'/>
    </g>`;
  return svgWrap(inner, '#221d44');
}

// The star floats down to a glowing magical forest.
function sceneForest(): string {
  let trees = '';
  const xs = [60,140,210,300,560,650,720];
  for (const x of xs) trees += `<rect x='${x}' y='420' width='14' height='90' fill='#1f3d2b'/><circle cx='${x+7}' cy='400' r='38' fill='#2f6b46'/><circle cx='${x-14}' cy='415' r='24' fill='#3c8458'/><circle cx='${x+24}' cy='410' r='22' fill='#3c8458'/>`;
  const inner = `${trees}
    <rect y='500' width='800' height='100' fill='#16301f'/>
    <g transform='translate(420,250)'>
      <circle r='44' fill='#3a3568'/>
      <path d='M0,-38 L9,-9 L38,-9 L14,8 L23,36 L0,19 L-23,36 L-14,8 L-38,-9 L-9,-9 Z' fill='#ffd76b' stroke='#fff3c4' stroke-width='3'/>
    </g>
    <circle cx='250' cy='150' r='3' fill='#fff' opacity='0.6'/><circle cx='600' cy='120' r='3' fill='#fff' opacity='0.6'/>
    <circle cx='700' cy='300' r='4' fill='#bff7d0' opacity='0.8'/><circle cx='160' cy='340' r='4' fill='#bff7d0' opacity='0.8'/>`;
  return svgWrap(inner, '#10271a');
}

// A pond of shimmering sparkles the star discovers.
function scenePond(): string {
  let sparkles = '';
  const pts = [[200,430],[280,470],[360,440],[440,480],[520,445],[300,520],[480,520],[180,500]];
  for (const [x,y] of pts) sparkles += `<path d='M${x},${y-8} L${x+3},${y-2} L${x+8},${y} L${x+3},${y+2} L${x},${y+8} L${x-3},${y+2} L${x-8},${y} L${x-3},${y-2} Z' fill='#fff3c4' opacity='0.9'/>`;
  const inner = `${sparkles}
    <rect y='400' width='800' height='200' fill='#1b3a5e'/>
    <ellipse cx='400' cy='520' rx='320' ry='70' fill='#2a5d8f'/>
    <ellipse cx='400' cy='510' rx='220' ry='46' fill='#3f7fb5' opacity='0.7'/>
    <g transform='translate(400,260)'>
      <circle r='46' fill='#3a3568'/>
      <path d='M0,-40 L10,-10 L40,-10 L15,8 L24,38 L0,20 L-24,38 L-15,8 L-40,-10 L-10,-10 Z' fill='#ffd76b' stroke='#fff3c4' stroke-width='3'/>
    </g>`;
  return svgWrap(inner, '#0e2236');
}

// The star befriends a small friendly dragon.
function sceneDragon(): string {
  const inner = `<rect y='470' width='800' height='130' fill='#3a2a1a'/>
    <circle cx='140' cy='110' r='3' fill='#fff' opacity='0.6'/><circle cx='660' cy='90' r='3' fill='#fff' opacity='0.6'/>
    <g transform='translate(470,340)'>
      <ellipse cx='0' cy='0' rx='70' ry='46' fill='#6fae5a'/>
      <path d='M-60,-10 Q-110,-60 -80,-80 Q-70,-40 -40,-30 Z' fill='#6fae5a'/>
      <circle cx='40' cy='-20' r='30' fill='#86c46c'/>
      <circle cx='32' cy='-26' r='5' fill='#221d44'/><circle cx='48' cy='-26' r='5' fill='#221d44'/>
      <path d='M30,-12 Q40,-4 50,-12' stroke='#221d44' stroke-width='3' fill='none' stroke-linecap='round'/>
      <path d='M64,-30 l10,-14 l6,14 Z' fill='#ffd76b'/>
    </g>
    <g transform='translate(300,300)'>
      <circle r='40' fill='#3a3568'/>
      <path d='M0,-34 L8,-8 L34,-8 L13,7 L20,32 L0,17 L-20,32 L-13,7 L-34,-8 L-8,-8 Z' fill='#ffd76b' stroke='#fff3c4' stroke-width='3'/>
    </g>`;
  return svgWrap(inner, '#241a12');
}

// The star's twinkle returns — the whole sky lights up with joy.
function sceneCelebrate(): string {
  let burst = '';
  const pts = [[400,300],[300,200],[500,200],[250,360],[550,360],[400,160],[330,440],[470,440]];
  for (const [x,y] of pts) burst += `<g transform='translate(${x},${y})'><path d='M0,-18 L4,-4 L18,-4 L6,4 L10,18 L0,9 L-10,18 L-6,4 L-18,-4 L-4,-4 Z' fill='#ffd76b'/></g>`;
  let stars = '';
  for (let i=0;i<40;i++){const x=Math.round(Math.random()*800);const y=Math.round(Math.random()*600);const r=(i%3)+1;stars+=`<circle cx='${x}' cy='${y}' r='${r}' fill='#fff' opacity='0.7'/>`;}
  const inner = `${stars}${burst}
    <g transform='translate(400,300)'>
      <circle r='80' fill='#4a4478'/>
      <path d='M0,-66 L16,-16 L66,-16 L25,14 L41,64 L0,34 L-41,64 L-25,14 L-66,-16 L-16,-16 Z' fill='#ffe08a' stroke='#fff7d6' stroke-width='3'/>
      <circle cx='-16' cy='-4' r='7' fill='#2a2350'/><circle cx='18' cy='-4' r='7' fill='#2a2350'/>
      <path d='M-18,18 Q0,34 18,18' stroke='#2a2350' stroke-width='4' fill='none' stroke-linecap='round'/>
    </g>`;
  return svgWrap(inner, '#1a1640');
}

// A gentle cover/title card for the sample book.
function sceneCover(): string {
  let stars = '';
  for (let i=0;i<30;i++){const x=Math.round(Math.random()*800);const y=Math.round(Math.random()*600);stars+=`<circle cx='${x}' cy='${y}' r='${(i%3)+1}' fill='#fff' opacity='0.55'/>`;}
  const inner = `${stars}
    <g transform='translate(400,230)'>
      <circle r='58' fill='#ffd76b' stroke='#fff7d6' stroke-width='4'/>
      <path d='M0,-50 L12,-12 L50,-12 L19,11 L31,49 L0,26 L-31,49 L-19,11 L-50,-12 L-12,-12 Z' fill='#ffe9a8' opacity='0.85'/>
    </g>
    <text x='400' y='400' text-anchor='middle' font-family='Georgia, serif' font-size='40' font-weight='bold' fill='#fff7d6'>The Little Star</text>
    <text x='400' y='448' text-anchor='middle' font-family='Georgia, serif' font-size='26' fill='#cfc6ff'>Who Found Her Twinkle</text>`;
  return svgWrap(inner, '#221d44');
}

export const DEMO_STORY = {
  title: 'The Little Star Who Found Her Twinkle',
  genre: 'Space Adventure',
  primaryLang: 'English',
  supportLang: 'Hinglish (Romanized Hindi)',
  pages: [
    {
      text: "High above the world, there lived a tiny little star named Stella. Every night she lit up the sky with a happy golden sparkle. But one evening, Stella's magic began to fade, and her twinkle went out.",
      translationText: 'Duniya ke uppar, ek chhoti si star rehti thi jiska naam tha Stella. Har raat woh apni khushi ke saath aasman ko chamkati thi. Par ek shaam, Stella ka magic kamzor padne laga, aur uski twinkle bujh gayi.',
      imagePrompt: 'a lonely small golden star in a deep night sky, soft and whimsical children book style',
      svg: sceneLonelyStar,
    },
    {
      text: "Stella floated sadly past the friendly Moon. 'Why so glum, little one?' asked the Moon with a warm smile. 'I have lost my twinkle,' whispered Stella. The Moon pointed a silver finger toward the森林 below.",
      translationText: "Stella udaas hokar friendly Moon ke paas se guzri. 'Itni udaas kyun ho, chhoti si?' Moon ne muskaan ke saath pucha. 'Meri twinkle kho gayi hai,' Stella ne fusfusaya. Moon ne neeche ke jungle ki taraf silver ungli uthai.",
      imagePrompt: 'a small golden star meeting a friendly smiling crescent moon in the night sky',
      svg: sceneMoon,
    },
    {
      text: "Down in the glowing forest, Stella met a tiny glowing bug. 'Follow the sparkle trail!' it buzzed. Together they explored the tall trees, where every leaf held a little light of its own.",
      translationText: "Chamakta hue jungle mein, Stella ko ek chhoti si glowing bug mili. 'Trail ke sparkle ko follow karo!' usne bhin-bhinaya. Saath mein unhone lambe pedon ka explore kiya, jahan har patte mein apni chhoti si roshni thi.",
      imagePrompt: 'a little star floating down into a magical glowing forest with friendly creatures',
      svg: sceneForest,
    },
    {
      text: "At the edge of a quiet pond, the water shimmered with sparkle. Stella dipped her light into the pool and watched a thousand tiny reflections shine back at her. 'Maybe my magic was here all along,' she giggled.",
      translationText: "Ek shaant pond ke kinare, paani mein sparkle chamak rahi thi. Stella ne apni roshni pool mein dabi aur hazaaron chhoti si parchhayiyon ko apni taraf shine karte dekha. 'Shayad mera magic yahin tha,' usne hansi.",
      imagePrompt: 'a star discovering a pond full of shimmering sparkles and reflections',
      svg: scenePond,
    },
    {
      text: "A small green dragon named Pip became Stella's friend. They played hide-and-seek among the glowing mushrooms. For the first time in days, Stella felt brave and happy, surrounded by a true friend.",
      translationText: "Pip naam ka ek chhota sa green dragon Stella ka friend ban gaya. Unhone glowing mushrooms ke beech chupam-chupai kheli. Dino baad pehli baar, Stella ne apne aap ko brave aur happy mehsoos kiya, ek sacche friend ke saath.",
      imagePrompt: 'a little golden star befriending a small cute green dragon among glowing mushrooms',
      svg: sceneDragon,
    },
    {
      text: "Stella climbed back to the sky, her heart full of friendship and courage. She switched on her light — and the brightest, happiest twinkle the night had ever seen lit up the whole world. The End.",
      translationText: 'Stella wapas aasman mein chadh gayi, uske dil mein dosti aur himmat bhari thi. Usne apni roshni jala di — aur raat ne ab tak ka sabse chamakdaar, sabse khush twinkle poori duniya mein faila diya. The End.',
      imagePrompt: 'the little star shining with a huge bright twinkle lighting up the whole night sky, joyful celebration',
      svg: sceneCelebrate,
    },
  ] as DemoPage[],
};

// Resolve any builder fns to strings at import time for easy consumption.
export function resolveDemoPages() {
  return DEMO_STORY.pages.map((p) => ({
    ...p,
    imageUrl: typeof p.svg === 'function' ? p.svg() : p.svg,
  }));
}
