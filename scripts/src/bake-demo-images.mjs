import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "artifacts/jump-the-book/assets/images/scenes";
const API = "http://localhost:80/api/scenes/image";
const BATCH = 1;

const SCENES = [
  { id: "alice-ch1-s1", style: "fantasy-illustration", prompt: "A cinematic storybook illustration of a young girl noticing a white rabbit in a waistcoat checking a pocket watch beside a quiet riverbank, magical atmosphere, soft golden light, whimsical details." },
  { id: "alice-ch1-s2", style: "fantasy-illustration", prompt: "A whimsical fantasy scene of a young girl chasing a white rabbit toward a dark rabbit hole under twisted roots, cinematic composition, magical storybook style." },
  { id: "alice-ch1-s3", style: "fantasy-illustration", prompt: "A surreal vertical tunnel filled with floating books, jars, maps and furniture as a young girl falls slowly through glowing darkness, cinematic fantasy illustration." },
  { id: "alice-ch1-s4", style: "fantasy-illustration", prompt: "A magical hallway lined with many tiny locked doors, a young girl standing in wonder beneath warm lantern light, dreamlike cinematic storybook style." },
  { id: "alice-ch1-s5", style: "fantasy-illustration", prompt: "A young girl kneeling beside a tiny glowing door that opens into a beautiful garden, golden key on a glass table, magical cinematic lighting." },
  { id: "alice-ch1-s6", style: "fantasy-illustration", prompt: "A mysterious glass bottle labelled Drink Me sitting on a small table in a magical hallway, a curious young girl reaching toward it, whimsical fantasy illustration." },
  { id: "dracula-ch1-s1", style: "dark-cinematic", prompt: "A horse-drawn coach traveling through dark Carpathian mountain roads at dusk, dramatic shadows and stormy skies, gothic atmosphere." },
  { id: "dracula-ch1-s2", style: "dark-cinematic", prompt: "A young man arriving at the massive gates of a gothic castle at night, a tall cloaked figure waiting in the doorway, blood red moon overhead." },
  { id: "dracula-ch1-s3", style: "dark-cinematic", prompt: "A young man peering through a barred window of a gothic castle, desperation in his face, dark mountains below, moonlit night." },
  { id: "frank-ch1-s1", style: "dark-cinematic", prompt: "A young scientist hunched over ancient books by candlelight, surrounded by bones and chemical equipment, Gothic laboratory atmosphere." },
  { id: "frank-ch1-s2", style: "dark-cinematic", prompt: "A dark laboratory filled with electrical equipment and lightning flashing through skylights, a large figure on a table covered in shadows." },
  { id: "frank-ch1-s3", style: "dark-cinematic", prompt: "A terrified scientist backing away from a large shadowed figure sitting upright, yellow eyes glowing in the darkness, gothic dramatic lighting." },
  { id: "sherlock-ch1-s1", style: "animated-storybook", prompt: "A Victorian sitting room with a detective in armchair examining a visiting nobleman in disguise, gaslight and book-lined walls, sepia tone." },
  { id: "sherlock-ch1-s2", style: "animated-storybook", prompt: "A Victorian woman in elegant dress walking confidently through foggy London streets at night, streetlamps glowing amber, a shadowed detective watching from a distance." },
  { id: "sherlock-ch1-s3", style: "animated-storybook", prompt: "A Victorian detective examining a small folded photograph by gaslight, magnifying glass in hand, sepia-toned study, intricate details." },
];

await mkdir(OUT_DIR, { recursive: true });

async function bake(scene) {
  const file = join(OUT_DIR, `${scene.id}.png`);
  if (existsSync(file)) {
    console.log(`[skip] ${scene.id} already exists`);
    return;
  }
  console.log(`[start] ${scene.id}`);
  const t0 = Date.now();
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: scene.prompt, style: scene.style }),
    });
    if (!res.ok) {
      console.error(`[fail] ${scene.id}: HTTP ${res.status}`);
      return;
    }
    const { b64 } = await res.json();
    if (!b64) {
      console.error(`[fail] ${scene.id}: no b64 in response`);
      return;
    }
    await writeFile(file, Buffer.from(b64, "base64"));
    console.log(`[done] ${scene.id} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.error(`[err] ${scene.id}:`, err.message);
  }
}

for (let i = 0; i < SCENES.length; i += BATCH) {
  const slice = SCENES.slice(i, i + BATCH);
  console.log(`--- batch ${Math.floor(i / BATCH) + 1} of ${Math.ceil(SCENES.length / BATCH)} ---`);
  await Promise.all(slice.map(bake));
}

console.log("ALL DONE");
