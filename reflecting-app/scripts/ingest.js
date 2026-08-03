#!/usr/bin/env node
/**
 * ingest.js  —  robust version
 * Parses names-of-Allah-seriesv3_readable.txt → public/names.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT  = path.join(__dirname, '..', '..', 'names-of-Allah-seriesv3_readable.txt');
const OUTPUT = path.join(__dirname, '..', 'public', 'names.json');

// ─── Cleaning helpers ────────────────────────────────────────────────────────
function cleanParagraph(text) {
  let t = text;
  // Collapse newlines within paragraph
  t = t.replace(/\n/g, ' ');
  // Remove "NAMES OF ALLAH SERIES r XX s" artifacts (with or without surrounding text)
  t = t.replace(/NAMES OF ALLAH SERIES\s*(r\s*\d+\s*s)?\s*/gi, '');
  // Remove lone page number artifacts like "r 35 s", "r 19 sr 18 s"
  t = t.replace(/\br\s*\d+\s*s(\s*r\s*\d+\s*s)*/g, '');
  // Fix drop-cap: single uppercase letter + space + lowercase (e.g. "B efore" → "Before")
  t = t.replace(/\b([A-Z])\s+([a-z]{2,})/g, '$1$2');
  // Fix "I " merged: "Ifound" → "I found", "Icame" → "I came" etc.
  t = t.replace(/\bI([a-z])/g, 'I $1');
  // Collapse multiple spaces
  t = t.replace(/  +/g, ' ');
  return t.trim();
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Chapter definition table ────────────────────────────────────────────────
// Each entry: { matchText (start of first paragraph), title, arabicName, translation }
// matchText is a unique string from the beginning of the paragraph that starts this chapter
const CHAPTER_DEFS = [
  {
    matchText: 'Seeking The Guide',
    title: 'Seeking The Guide',
    arabicName: 'Al-Haadi',
    translation: 'The Guide',
  },
  {
    matchText: 'The Giver of Gifts',
    title: 'The Giver of Gifts',
    arabicName: 'Al-Wahhab',
    translation: 'The Constant Bestower of Gifts',
  },
  {
    matchText: 'The Provider',
    title: 'The Provider',
    arabicName: 'Ar-Razzaq',
    translation: 'The Provider',
  },
  {
    matchText: 'Al-Haleem',
    title: 'Al-Haleem',
    arabicName: 'Al-Haleem',
    translation: 'The Forbearing',
  },
  {
    matchText: "Allah's Beautiful Name: As-Siteer",
    title: "Allah's Beautiful Name: As-Siteer",
    arabicName: 'As-Siteer',
    translation: 'The Concealer',
  },
  {
    matchText: 'The One Who Responds',
    title: 'The One Who Responds',
    arabicName: 'Al-Mujeeb',
    translation: 'The Responsive',
  },
  {
    matchText: 'At-Tawwab: Part I',
    title: 'At-Tawwab: Part I',
    arabicName: 'At-Tawwab',
    translation: 'The Ever-Returning (Part I)',
    matchFn: (p) => /At-Tawwab.*Part I/i.test(p.substring(0, 60)),
  },
  {
    matchText: 'At-Tawwab: Part 2',
    title: 'At-Tawwab: Part II',
    arabicName: 'At-Tawwab',
    translation: 'The Ever-Returning (Part II)',
    matchFn: (p) => /At-Tawwab.*Part 2/i.test(p.substring(0, 60)),
  },
  {
    matchText: 'He Who Opens All Things',
    title: 'He Who Opens All Things',
    arabicName: 'Al-Fattah',
    translation: 'The Opener',
  },
  {
    matchText: 'The Creator, The Producer, The Fashioner',
    title: 'The Creator, The Producer, The Fashioner',
    arabicName: 'Al-Khaaliq / Al-Baari\' / Al-Musawwir',
    translation: 'The Creator, The Inventor, The Fashioner',
  },
  {
    matchText: 'Who Has Your Trust?',
    title: 'Who Has Your Trust?',
    arabicName: 'Al-Wakeel',
    translation: 'The Trustee',
  },
  {
    matchText: 'The Absolute Truth',
    title: 'The Absolute Truth',
    arabicName: 'Al-Haqq',
    translation: 'The Absolute Truth',
  },
  {
    matchText: 'The Entirely Merciful, The Especially Merciful, The Most Kind',
    title: 'The Entirely Merciful, The Especially Merciful, The Most Kind',
    arabicName: "Ar-Rahman / Ar-Raheem / Ar-Ra'uf",
    translation: 'The All-Encompassing Mercy',
    matchFn: (p) => /Entirely Merciful.*Especially Merciful/i.test(p.substring(0, 100)),
  },
  {
    matchText: "Don't Say I Have a Big Problem",
    title: "Don't Say I Have a Big Problem — Say I Have a Big God",
    arabicName: 'Al-Kabeer / Al-Akbar / Al-Mutakabbir',
    translation: 'The Most Great',
    matchFn: (p) => /Don.t Say I Have a Big Problem/i.test(p.substring(0, 60)),
  },
  {
    matchText: 'So We Strengthened Them with a Third',
    title: 'So We Strengthened Them with a Third',
    arabicName: "Al-'Azeez",
    translation: 'The Mighty',
    matchFn: (p) => /So We Strengthened Them with a Third/i.test(p.substring(0, 60)),
  },
  {
    matchText: 'The Most Loving',
    title: 'The Most Loving',
    arabicName: 'Al-Wadud',
    translation: 'The Most Loving',
    matchFn: (p) => /^The Most Loving/i.test(p.substring(0, 20)),
  },
  {
    matchText: 'Al-Lateef',
    title: 'The Subtle, The All-Aware',
    arabicName: 'Al-Lateef / Al-Khabeer',
    translation: 'The Subtle, The All-Aware',
    matchFn: (p) => /Al-Lateef/i.test(p.substring(0, 40)),
  },
  {
    matchText: 'The Most Generous',
    title: 'The Most Generous',
    arabicName: 'Al-Kareem',
    translation: 'The Most Generous',
    matchFn: (p) => /^The Most Generous/i.test(p.substring(0, 25)),
  },
  {
    matchText: 'The Near, The Responsive',
    title: 'The Near, The Responsive',
    arabicName: 'Al-Qareeb / Al-Mujeeb',
    translation: 'The Near, The Responsive',
    matchFn: (p) => /^The Near.*Responsive|^Closer To You Than Yourself/i.test(p.substring(0, 40)),
  },
  {
    matchText: 'The Patient',
    title: 'The Patient',
    arabicName: 'Al-Sabur',
    translation: 'The Patient',
    matchFn: (p) => /^The Patient/i.test(p.substring(0, 15)),
  },
  {
    matchText: 'He Heals The Hearts',
    title: 'He Heals The Hearts',
    arabicName: 'Al-Shafi',
    translation: 'The Healer',
    matchFn: (p) => /He Heals The Hearts/i.test(p.substring(0, 40)),
  },
  {
    matchText: 'He Has Your Back',
    title: 'He Has Your Back',
    arabicName: 'Al-Wali / Al-Mawla',
    translation: 'The Protecting Friend',
    matchFn: (p) => /He Has Your Back/i.test(p.substring(0, 30)),
  },
  {
    matchText: 'Take Your Needs To The One Who Has No Needs',
    title: 'Take Your Needs To The One Who Has No Needs',
    arabicName: 'Al-Ghani',
    translation: 'The Self-Sufficient',
    matchFn: (p) => /Take Your Needs To The One Who Has No Needs/i.test(p.substring(0, 55)),
  },
  {
    matchText: 'When You Are Not Able, Ask For Strength',
    title: 'When You Are Not Able, Ask For Strength',
    arabicName: 'Al-Qadir / Al-Muqtadir',
    translation: 'The All-Powerful',
    matchFn: (p) => /When You Are Not Able.*Ask For Strength/i.test(p.substring(0, 60)),
  },
  {
    matchText: 'When We Are Raised Again',
    title: 'When We Are Raised Again',
    arabicName: "Al-Ba'ith",
    translation: 'The Resurrector',
    matchFn: (p) => /When We Are Raised Again/i.test(p.substring(0, 40)),
  },
  {
    matchText: 'Allah Is Sufficient',
    title: 'Allah Is Sufficient',
    arabicName: 'Al-Haseeb',
    translation: 'The Reckoner, The Sufficient',
    matchFn: (p) => /^Allah Is Sufficient/i.test(p.substring(0, 25)),
  },
  {
    matchText: 'How Far Does Your Justice Go?',
    title: 'How Far Does Your Justice Go?',
    arabicName: 'Al-Adl',
    translation: 'The Just',
    matchFn: (p) => /How Far Does Your Justice Go\?/i.test(p.substring(0, 40)),
  },
  {
    matchText: 'Seeing Beyond: He Who Harms, He Who Benefits',
    title: 'Seeing Beyond: He Who Harms, He Who Benefits',
    arabicName: 'Ad-Darr / An-Nafi\'',
    translation: 'He Who Harms, He Who Benefits',
    matchFn: (p) => /Seeing Beyond.*He Who Harms/i.test(p.substring(0, 60)),
  },
  {
    matchText: "When The Timing Isn't 'Right'",
    title: "When The Timing Isn't 'Right'",
    arabicName: 'Al-Muqaddim / Al-Mu\'akhkhir',
    translation: 'He Who Brings Forward, He Who Delays',
    matchFn: (p) => /When The Timing Isn.t/i.test(p.substring(0, 30)),
  },
  {
    matchText: 'Closer To You Than Yourself',
    title: 'Closer To You Than Yourself',
    arabicName: 'Al-Qareeb',
    translation: 'The Near',
    matchFn: (p) => /Closer To You Than Yourself/i.test(p.substring(0, 35)),
  },
  {
    matchText: 'The Forgiving',
    title: 'The Forgiving',
    arabicName: 'Al-Ghafir / Al-Ghafur / Al-Ghaffar',
    translation: 'The Forgiving',
    matchFn: (p) => /al-Ghafir.*al-Ghafur.*al-Ghaffar|^The Forgiving/i.test(p.substring(0, 80)),
  },
  {
    matchText: 'Do You Think You Can\'t Come Back?',
    title: "Do You Think You Can't Come Back?",
    arabicName: "Al-Awwal / Al-Akhir",
    translation: 'The First, The Last',
    matchFn: (p) => /Do You Think You Can.t Come Back\?/i.test(p.substring(0, 45)),
  },
  {
    matchText: 'Pouring Blessings',
    title: 'Pouring Blessings',
    arabicName: 'Al-Mannan',
    translation: 'The Bestower of Blessings',
    matchFn: (p) => /^Pouring Blessings/i.test(p.substring(0, 25)),
  },
  {
    matchText: "Making it All Clear",
    title: 'Making it All Clear',
    arabicName: 'Al-Mubin',
    translation: 'The Evident',
    matchFn: (p) => /Making it All Clear/i.test(p.substring(0, 30)),
  },
  {
    matchText: 'The Cures',
    title: 'The Protective Wing',
    arabicName: 'Al-Muhaymin',
    translation: 'The Guardian',
    matchFn: (p) => /The Protective Wing|Al-Muhaymin/i.test(p.substring(0, 40)),
  },
  {
    matchText: '"Know That Victory Comes With Patience',
    title: '"Know That Victory Comes With Patience…"',
    arabicName: 'Al-Nasir',
    translation: 'The Helper',
    matchFn: (p) => /Know That Victory Comes With Patience/i.test(p.substring(0, 50)),
  },
  {
    matchText: 'The Ever-Living, The Self-Subsisting',
    title: 'The Ever-Living, The Self-Subsisting',
    arabicName: 'Al-Hayy / Al-Qayyum',
    translation: 'The Ever-Living, The Self-Subsisting',
    matchFn: (p) => /Al-Hayy.*Al-Qayyum|The Ever-Living.*Self-Subsisting/i.test(p.substring(0, 70)),
  },
  {
    matchText: 'The Majestic',
    title: 'The Majestic',
    arabicName: 'Al-Jaleel / Al-Azeem',
    translation: 'The Majestic, The Great',
    matchFn: (p) => /^The Majestic|al-Jaleel.*al-Azeem/i.test(p.substring(0, 40)),
  },
  {
    matchText: 'Allah — No God But He',
    title: 'Allah — No God But He',
    arabicName: 'Allah',
    translation: 'The One True God',
    matchFn: (p) => /Allah.*No God But He/i.test(p.substring(0, 50)),
  },
  {
    matchText: '"To God Belong the Best Names',
    title: '"To God Belong the Best Names, So Call on Him Using Them…"',
    arabicName: "Al-Asma' Al-Husna",
    translation: 'The 99 Beautiful Names — Conclusion',
    matchFn: (p) => /To God Belong the Best Names/i.test(p.substring(0, 60)),
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────
function main() {
  const raw = fs.readFileSync(INPUT, 'utf-8');

  // Split into paragraphs
  const allParas = raw
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 8);

  // Find where each chapter starts
  const matches = [];
  let searchFrom = 0;

  for (const def of CHAPTER_DEFS) {
    let found = -1;
    for (let i = searchFrom; i < allParas.length; i++) {
      const p = allParas[i];
      const test = def.matchFn
        ? def.matchFn(p)
        : p.startsWith(def.matchText.substring(0, Math.min(def.matchText.length, 30)));
      if (test) {
        found = i;
        break;
      }
    }
    if (found !== -1) {
      matches.push({ def, startIdx: found });
      searchFrom = found + 1;
    } else {
      console.warn(`⚠  Could not locate: "${def.title}" (from para ${searchFrom})`);
    }
  }

  // Slice paragraphs per chapter and clean
  const chapters = matches.map((m, i) => {
    const nextStart = i + 1 < matches.length ? matches[i + 1].startIdx : allParas.length;
    const rawParas = allParas.slice(m.startIdx, nextStart);

    const paragraphs = rawParas
      .map(p => cleanParagraph(p))
      .filter(p => {
        if (p.length < 20) return false;
        // Discard noise-only paragraphs
        if (/^\d+$/.test(p)) return false;
        return true;
      });

    // Strip the chapter title from the beginning of the first paragraph body
    if (paragraphs.length > 0) {
      const titleLen = m.def.matchText.length;
      const firstPara = paragraphs[0];
      // Clean version of title for comparison
      const titleClean = m.def.matchText.replace(/\s+/g, ' ').trim();
      if (firstPara.startsWith(titleClean)) {
        paragraphs[0] = firstPara.substring(titleClean.length).replace(/^[\s–—:]+/, '').trim();
      }
      // Also handle when first para starts with cleaned title via fuzzy
      const firstWords = firstPara.substring(0, titleLen + 10);
      if (firstWords.replace(/[^a-z]/gi, '').toLowerCase()
          .startsWith(titleClean.replace(/[^a-z]/gi, '').toLowerCase().substring(0, 15))) {
        paragraphs[0] = firstPara.substring(Math.min(titleLen, firstPara.length)).replace(/^[\s–—:]+/, '').trim();
      }
      if (paragraphs[0].length < 20) paragraphs.shift();
    }

    return {
      id: `${String(i + 1).padStart(2, '0')}-${slugify(m.def.title)}`,
      number: i + 1,
      title: m.def.title,
      arabicName: m.def.arabicName,
      translation: m.def.translation,
      body: paragraphs,
    };
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(chapters, null, 2), 'utf-8');

  console.log(`\n✅  Ingested ${chapters.length} chapters → public/names.json\n`);
  chapters.forEach((ch) => {
    console.log(`  ${String(ch.number).padStart(2)} · ${ch.title.padEnd(52)} (${ch.body.length} paragraphs)`);
  });
}

main();
