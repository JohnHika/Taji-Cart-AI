/**
 * generateHairDescriptions.js
 *
 * Batch-populates `description` and `more_details` for all hair products
 * in the database based on their handle type, texture, color, and length.
 *
 * Usage:
 *   cd server
 *   node scripts/generateHairDescriptions.js
 *
 * Supports --dry-run flag to preview without writing to DB.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ProductModel from '../models/product.model.js';
import connectDB from '../config/connectDB.js';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

// ── Color code → human-readable name ───────────────────────────────────────
const COLOR_NAMES = {
  '1B': 'Natural Black',
  '#1B': 'Natural Black',
  '#4': 'Dark Brown',
  '#6': 'Medium Brown',
  '#24': 'Sandy Blonde',
  '#27': 'Strawberry Blonde',
  '#30': 'Medium Auburn',
  '#33': 'Dark Auburn',
  '#350': 'Copper Red',
  '#613': 'Platinum Blonde',
  '#60': 'Light Blonde',
  '#118': 'Dark Auburn Mix',
  '#171': 'Dusty Ash Brown',
  'BUG': 'Burgundy',
  '99J': 'Wine Red',
  '99j': 'Wine Red',
  'GREY': 'Silver Grey',
  'II GREY': 'Light Silver Grey',
  'PINK': 'Pastel Pink',
  'II PINK': 'Baby Pink',
  'BLUE': 'Royal Blue',
  'RED': 'Vivid Red',
  'BLACK': 'Jet Black',
  'BROWN': 'Warm Brown',
  'GINGER': 'Ginger',
  'T30': 'Tip Ombre Auburn',
  'T27': 'Tip Ombre Blonde',
  'T33': 'Tip Ombre Dark Auburn',
  'T350': 'Tip Ombre Copper',
  'TBUG': 'Tip Ombre Burgundy',
  'TGREY': 'Tip Ombre Grey',
  'OT30': 'Off-Tip Ombre Auburn',
  'OT27': 'Off-Tip Ombre Blonde',
  'OT33': 'Off-Tip Ombre Dark Red',
  'OT350': 'Off-Tip Ombre Copper',
  'OTBUG': 'Off-Tip Ombre Burgundy',
  'OTGREEN': 'Forest Green Ombre',
  'OTRED': 'Red Ombre',
  'OT27613': 'Ombre Blonde Mix',
  'OT33/30': 'Ombre Auburn Blend',
  'OT33/3O': 'Ombre Auburn Blend',
  'P27/30': 'Piano Blonde–Auburn',
  'P30/33': 'Piano Auburn Blend',
  'P27/33': 'Piano Honey Blend',
  'P30/613': 'Piano Auburn–Platinum',
  'P27/613': 'Piano Blonde–Platinum',
  'P33/613': 'Piano Auburn–Platinum',
  'P27/33/613': 'Piano Honey–Platinum Mix',
  'P27/30/613': 'Piano Blonde–Platinum Mix',
  'P27/PINK/613': 'Piano Pink Blend',
  'P30/33': 'Piano Auburn Blend',
  'P27/30': 'Piano Honey–Auburn',
  'P24/171': 'Piano Sandy Blend',
  '1B/4/30': 'Natural Black to Auburn Ombre',
  '1B/30/27': 'Natural Black to Honey Ombre',
  '1B/30/613': 'Natural Black to Platinum Ombre',
  '1B/27/613': 'Natural Black to Platinum Ombre',
  'T27/613': 'Tip Ombre Blonde–Platinum',
  '4/27/613': 'Brown to Platinum Ombre',
  '3T/530/350': 'Triple-Tone Copper',
  '3T350': 'Triple-Tone Copper',
  '1B/30/27': 'Natural to Honey Ombre',
  'C4': 'Cool Brown',
  'C10': 'Ash Brown',
  'C11': 'Warm Taupe',
  'C13': 'Chestnut',
  'C14': 'Espresso Brown',
  'C15': 'Walnut Brown',
  'C17': 'Rich Cocoa',
  'C18': 'Warm Cocoa',
  'C19': 'Deep Cocoa',
  'C22': 'Caramel Brown',
  'C23': 'Golden Caramel',
  'C24': 'Light Caramel',
  'C25': 'Honey Caramel',
  'C26': 'Butterscotch',
  'C3/C9': 'Cool Tones Mix',
  'C4/C22': 'Brown–Caramel Mix',
  'C5/C13': 'Dark–Chestnut Mix',
  'C6/C26': 'Cocoa–Butterscotch Mix',
  'C7/C10': 'Warm–Ash Mix',
  'B5': 'Soft Black',
  'B6': 'Dark Espresso',
  'B8': 'Dark Brown',
  'B26': 'Warm Cocoa',
  'B29': 'Caramel',
  'B31': 'Rich Auburn',
  'B35': 'Warm Auburn',
  'B41': 'Deep Burgundy Brown',
  'C6': 'Cocoa',
  'C7': 'Warm Hazel',
  'C9': 'Cool Hazel',
  'D3': 'Mocha',
  'D4': 'Deep Mocha',
  'D.PINK': 'Deep Pink',
  'L.PURPLE': 'Lavender',
  'D.PURPLE': 'Deep Purple',
  'L.PINK': 'Light Pink',
  'L.BLUE': 'Light Blue',
  'D.BLUE': 'Deep Blue',
  'MP2': 'Mixed Palette 2',
  'OT27613': 'Off-Tip Blonde–Platinum',
  'T1B/30': 'Tip Ombre Black–Auburn',
  '0T33': 'Ombre Dark Red',
  '0T27': 'Ombre Blonde',
  'ot30': 'Ombre Auburn',
  'OTGREY': 'Off-Tip Ombre Grey',
  '#30 NEW': 'Medium Auburn (New)',
  'P27/PINK': 'Honey Pink',
};

const colorName = (code) => COLOR_NAMES[code] || code;

// ── Per-handle description templates ───────────────────────────────────────
// Each entry: { description(product) → string, details(product) → object }
const HANDLE_TEMPLATES = {

  'passion-twist': {
    description: (p) =>
      `The Passion Twist in ${colorName(p.variants?.color)} is a pre-looped, lightweight braiding hair that delivers effortless, bohemian-style twists. ` +
      `Crafted with a soft, springy texture, this pack creates full, fluffy twists with minimal effort — no professional braider needed. ` +
      `${p.variants?.length && p.variants.length !== 'N/A' ? `At ${p.variants.length}, these twists offer a beautifully elongated silhouette and stay all day. ` : ''}` +
      `Perfect for protective styling, the passion twist is low-maintenance and gentle on natural hair.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Braiding Hair',
      'Style': 'Passion Twist',
      'Texture': 'Spring / Springy',
      'Color': colorName(p.variants?.color),
      ...(p.variants?.length && p.variants.length !== 'N/A' ? { 'Length': p.variants.length } : {}),
      'Installation': 'Pre-looped — No knot needed',
      'Maintenance': 'Gently detangle with fingers; avoid direct heat',
      'Best For': 'Protective styling, natural hair',
    }),
  },

  'nubian-twist': {
    description: (p) =>
      `Nubian Twist hair in ${colorName(p.variants?.color)} is ideal for creating tight, coily twists that celebrate your natural texture. ` +
      `This kinky braiding hair mimics the beauty of type 4 natural hair, giving your twists a full-bodied, voluminous look. ` +
      `${p.variants?.length && p.variants.length !== 'N/A' ? `The ${p.variants.length} length provides a chic, versatile finish you can wear up or down. ` : ''}` +
      `Lightweight and durable, Nubian twists are a top choice for long-lasting protective styles.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Braiding Hair',
      'Style': 'Nubian Twist',
      'Texture': 'Kinky / Coily',
      'Color': colorName(p.variants?.color),
      ...(p.variants?.length && p.variants.length !== 'N/A' ? { 'Length': p.variants.length } : {}),
      'Best For': 'Protective styles, natural hair lovers',
      'Maintenance': 'Finger-detangle; avoid heat',
    }),
  },

  'nubian': {
    description: (p) =>
      `Nubian hair in ${colorName(p.variants?.color)} offers a beautiful straight texture inspired by natural African hair. ` +
      `${p.variants?.length && p.variants.length !== 'N/A' ? `At a neat ${p.variants.length}, it is perfect for short protective styles or kids' hair. ` : ''}` +
      `Soft, tangle-free and easy to style, this versatile hair blends seamlessly with natural hair.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Hair',
      'Style': 'Nubian',
      'Texture': 'Straight',
      'Color': colorName(p.variants?.color),
      ...(p.variants?.length && p.variants.length !== 'N/A' ? { 'Length': p.variants.length } : {}),
      'Best For': 'Short protective styles',
      'Maintenance': 'Low maintenance; finger comb',
    }),
  },

  'marley-twist': {
    description: (p) =>
      `Marley Twist hair in ${colorName(p.variants?.color)} delivers a bold, textured look that pays homage to classic Afrocentric style. ` +
      `The coarse, Marley texture gives twists incredible body and fullness, making each strand look rich and voluminous. ` +
      `${p.variants?.length && p.variants.length !== 'N/A' ? `At ${p.variants.length}, the twists flow gracefully while maintaining great definition. ` : ''}` +
      `An excellent choice for anyone who wants striking, statement-making natural twists.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Braiding Hair',
      'Style': 'Marley Twist',
      'Texture': 'Coarse / Kinky',
      'Color': colorName(p.variants?.color),
      ...(p.variants?.length && p.variants.length !== 'N/A' ? { 'Length': p.variants.length } : {}),
      'Best For': 'Protective natural styles',
      'Maintenance': 'Avoid excessive moisture; seal ends with a small amount of oil',
    }),
  },

  'honey-twist': {
    description: (p) =>
      `Honey Twist hair in ${colorName(p.variants?.color)} creates beautifully glossy, honeyed twists with a soft, feathery texture. ` +
      `This lightweight hair is designed for a chic, defined twist-out or traditional twist style. ` +
      `${p.variants?.length && p.variants.length !== 'N/A' ? `The ${p.variants.length} length strikes the perfect balance between playful and elegant. ` : ''}` +
      `Ideal for achieving a polished look with minimal effort.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Braiding Hair',
      'Style': 'Honey Twist',
      'Texture': 'Silky / Feathery',
      'Color': colorName(p.variants?.color),
      ...(p.variants?.length && p.variants.length !== 'N/A' ? { 'Length': p.variants.length } : {}),
      'Best For': 'Defined twists, protective styles',
      'Maintenance': 'Finger-detangle; light oil mist to refresh',
    }),
  },

  'french-curl': {
    description: (p) =>
      `French Curl braiding hair in ${colorName(p.variants?.color)} features tightly coiled, springy curls at the ends that add a luxurious, romantic finish to any braid or twist style. ` +
      `The crochet-style curl pattern blends effortlessly with natural textures for a seamless look. ` +
      `${p.variants?.length && p.variants.length !== 'N/A' ? `At ${p.variants.length}, the curls cascade beautifully for a full, bouncy effect. ` : ''}` +
      `French Curl is the go-to choice for goddess braids, boho box braids, and crochet installs.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Crochet / Braiding Hair',
      'Style': 'French Curl',
      'Texture': 'Curly / Coily',
      'Color': colorName(p.variants?.color),
      ...(p.variants?.length && p.variants.length !== 'N/A' ? { 'Length': p.variants.length } : {}),
      'Installation': 'Crochet braiding',
      'Best For': 'Goddess braids, bohemian braids, crochet styles',
      'Maintenance': 'Spritz curls with water to re-activate; avoid heat styling',
    }),
  },

  'xpression-braids': {
    description: (p) =>
      `Xpression Braiding Hair in ${colorName(p.variants?.color)} is the industry standard for box braids, cornrows, and feed-in styles. ` +
      `Known for its smooth texture, consistent thickness, and incredible length, Xpression hair braids up quickly and holds beautifully. ` +
      `A single pack gives excellent coverage, making your protective style last for weeks.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Braiding Hair',
      'Style': 'Box Braids / Cornrows / Feed-in',
      'Texture': 'Straight',
      'Color': colorName(p.variants?.color),
      'Length': 'Standard / Long',
      'Installation': 'Braiding — fold-over method',
      'Best For': 'Box braids, cornrows, feed-in braids, knotless braids',
      'Maintenance': 'Seal ends with hot water dip; moisturise scalp weekly',
    }),
  },

  'bonestraight': {
    description: (p) =>
      `Bonestraight hair in ${colorName(p.variants?.color)} is ultra-sleek, pin-straight synthetic hair that mimics the smooth, glossy look of bone-straight human hair. ` +
      `${p.variants?.length && p.variants.length !== 'N/A' ? `At ${p.variants.length}, it delivers an elegant, flowing silhouette that turns heads. ` : ''}` +
      `This hair lies flat, resists frizz, and maintains its sleek look all day long — perfect for a polished, refined appearance.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Hair Extension',
      'Style': 'Bone Straight',
      'Texture': 'Silky Straight',
      'Color': colorName(p.variants?.color),
      ...(p.variants?.length && p.variants.length !== 'N/A' ? { 'Length': p.variants.length } : {}),
      'Best For': 'Sleek styles, weave, ponytails',
      'Maintenance': 'Use a wide-tooth comb; avoid high heat',
    }),
  },

  'ombre-short': {
    description: (p) =>
      `This Ombre Short hair extension in ${colorName(p.variants?.color)} showcases a stunning two-tone colour gradient that transitions seamlessly from root to tip. ` +
      `The shorter length makes it easy to style and maintain, while the ombre effect adds depth and visual interest to any look. ` +
      `A bold choice for those who love expressive colour without the commitment of dyeing.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Hair Extension',
      'Style': 'Ombre',
      'Length': 'Short',
      'Color': colorName(p.variants?.color),
      'Colour Effect': 'Two-tone gradient',
      'Best For': 'Short styles, colour-pop looks',
      'Maintenance': 'Detangle gently; avoid heat',
    }),
  },

  'ombre-long': {
    description: (p) =>
      `The Ombre Long hair extension in ${colorName(p.variants?.color)} creates a dramatic, flowing gradient look with a beautifully blended colour transition from dark roots to light tips. ` +
      `The generous length offers maximum styling versatility — wear it loose, in a ponytail, or swept up for special occasions. ` +
      `A show-stopping style for those who love expressive, statement hair.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Hair Extension',
      'Style': 'Ombre',
      'Length': 'Long',
      'Color': colorName(p.variants?.color),
      'Colour Effect': 'Gradient ombre',
      'Best For': 'Flowing styles, special occasions',
      'Maintenance': 'Wide-tooth comb; light leave-in spray',
    }),
  },

  'deep-twist': {
    description: (p) =>
      `Deep Twist hair in ${colorName(p.variants?.color)} features a deep-wave, spiral-twist pattern that creates luxurious, textured twists with incredible volume. ` +
      `The rich, wavy texture gives your twists a naturally beautiful, lived-in look that blends seamlessly with type 3–4 hair. ` +
      `Durable and long-lasting, Deep Twist is perfect for goddess twists, passion twists, and free-flowing crochet styles.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Braiding Hair',
      'Style': 'Deep Twist',
      'Texture': 'Deep Wave / Spiral',
      'Color': colorName(p.variants?.color),
      'Best For': 'Goddess twists, bohemian styles, crochet',
      'Maintenance': 'Mist with water to refresh; avoid direct heat',
    }),
  },

  'sparkle-braids': {
    description: (p) =>
      `Sparkle Braids in ${colorName(p.variants?.color)} are eye-catching braiding hair strands woven with glittery metallic fibres that catch the light beautifully. ` +
      `Perfect for festivals, special occasions, or whenever you want your braids to shimmer and stand out. ` +
      `Lightweight and easy to install, Sparkle Braids add a touch of glamour to any braid style.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Braiding Hair',
      'Style': 'Sparkle / Glitter Braids',
      'Texture': 'Smooth with metallic fibres',
      'Color': colorName(p.variants?.color),
      'Special Feature': 'Light-catching glitter fibres',
      'Best For': 'Festivals, special occasions, knotless braids',
      'Maintenance': 'Handle gently; store loosely to preserve sparkle',
    }),
  },

  'deep-locs': {
    description: (p) =>
      `Deep Locs in ${colorName(p.variants?.color)} deliver an authentic loc look with a lush, textured surface that mimics the natural matting and depth of real dreadlocks. ` +
      `These synthetic locs are lightweight, pre-made for quick installation, and hold their shape beautifully throughout the day. ` +
      `An ideal choice for anyone who wants the loc aesthetic without the long commitment of growing natural locs.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Locs',
      'Style': 'Deep Locs',
      'Texture': 'Deep-textured / Faux locs',
      'Color': colorName(p.variants?.color),
      'Installation': 'Crochet or wrapping method',
      'Best For': 'Faux locs, protective styles',
      'Maintenance': 'Seal ends for neatness; oil scalp regularly',
    }),
  },

  'passion-locs': {
    description: (p) =>
      `Passion Locs in ${colorName(p.variants?.color)} combine the elegance of locs with a soft, boho-chic aesthetic for a romantic, free-spirited look. ` +
      `${p.variants?.length && p.variants.length !== 'N/A' ? `At ${p.variants.length}, they offer a beautiful, flowing silhouette. ` : ''}` +
      `Lightweight and natural-looking, Passion Locs are easy to install and maintain while keeping your natural hair protected.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Faux Locs',
      'Style': 'Passion Locs',
      'Texture': 'Soft / Bohemian',
      'Color': colorName(p.variants?.color),
      ...(p.variants?.length && p.variants.length !== 'N/A' ? { 'Length': p.variants.length } : {}),
      'Installation': 'Crochet or wrapping',
      'Best For': 'Bohemian protective styles',
      'Maintenance': 'Light oil on scalp; avoid excessive water',
    }),
  },

  'gypsy-locs': {
    description: (p) =>
      `Gypsy Locs in ${colorName(p.variants?.color)} blend the structured beauty of locs with free-flowing, loose curls for a bohemian, goddess-inspired look. ` +
      `${p.variants?.length && p.variants.length !== 'N/A' ? `The ${p.variants.length} length allows for gorgeous movement and styling versatility. ` : ''}` +
      `Gypsy Locs are the perfect statement style for anyone embracing their inner free spirit.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Faux Locs',
      'Style': 'Gypsy Locs',
      'Texture': 'Curly-ended locs',
      'Color': colorName(p.variants?.color),
      ...(p.variants?.length && p.variants.length !== 'N/A' ? { 'Length': p.variants.length } : {}),
      'Best For': 'Bohemian styles, goddess locs',
      'Maintenance': 'Spritz curled ends with water to refresh',
    }),
  },

  'riverlocs': {
    description: (p) =>
      `Riverlocs in ${colorName(p.variants?.color)} are an ultra-lightweight faux loc option designed for maximum comfort and a natural-looking finish. ` +
      `${p.variants?.length && p.variants.length !== 'N/A' ? `At ${p.variants.length}, they create a beautifully flowing, dimensional loc style. ` : ''}` +
      `The smooth, cylindrical body tapers naturally at the ends for an effortlessly chic look.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Faux Locs',
      'Style': 'Riverlocs',
      'Texture': 'Smooth / Lightweight',
      'Color': colorName(p.variants?.color),
      ...(p.variants?.length && p.variants.length !== 'N/A' ? { 'Length': p.variants.length } : {}),
      'Best For': 'Long-wear protective styles, faux locs',
      'Maintenance': 'Regular scalp oiling; avoid excess product build-up',
    }),
  },

  'queen-locs': {
    description: (p) =>
      `Queen Locs in ${colorName(p.variants?.color)} are a regal, full-bodied faux loc style that commands attention. ` +
      `With a thick, generous body and beautifully finished ends, these locs have a royal presence. ` +
      `Quick to install and long-lasting, Queen Locs are the ultimate expression of queenly confidence.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Faux Locs',
      'Style': 'Queen Locs',
      'Texture': 'Full / Rich-bodied',
      'Color': colorName(p.variants?.color),
      'Best For': 'Statement protective styles',
      'Maintenance': 'Seal ends; keep scalp moisturised',
    }),
  },

  'boho-nu-locs': {
    description: (p) =>
      `Boho Nu Locs in ${colorName(p.variants?.color)} offer a modern take on faux locs with a boho-chic aesthetic. ` +
      `The slightly distressed, wispier texture gives these locs a lived-in, natural appearance that looks effortlessly beautiful. ` +
      `Perfect for the free-spirited woman who wants a protective style with personality.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Faux Locs',
      'Style': 'Boho Nu Locs',
      'Texture': 'Textured / Boho',
      'Color': colorName(p.variants?.color),
      'Best For': 'Bohemian looks, casual protective styles',
      'Maintenance': 'Light oil mist; gentle finger-styling',
    }),
  },

  'nu-locs': {
    description: (p) =>
      `Nu Locs in ${colorName(p.variants?.color)} are a sleek, modern faux loc style with clean lines and a polished finish. ` +
      `${p.variants?.length && p.variants.length !== 'N/A' ? `At ${p.variants.length}, they offer a versatile length that works for both everyday wear and special occasions. ` : ''}` +
      `A contemporary favourite for anyone who wants a refined, put-together loc look.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Faux Locs',
      'Style': 'Nu Locs',
      'Texture': 'Smooth / Polished',
      'Color': colorName(p.variants?.color),
      ...(p.variants?.length && p.variants.length !== 'N/A' ? { 'Length': p.variants.length } : {}),
      'Best For': 'Modern faux locs, protective styles',
      'Maintenance': 'Light scalp oil; avoid heavy products on locs',
    }),
  },

  'exotic': {
    description: (p) =>
      `Exotic hair extension in ${colorName(p.variants?.color)} is a premium straight hair with a luxuriously smooth, silky texture that drapes beautifully. ` +
      `This versatile hair blends naturally with relaxed or straightened hair and holds style well throughout the day. ` +
      `Whether worn loose, in a ponytail, or styled up, Exotic hair adds instant glamour to any look.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Hair Extension',
      'Style': 'Exotic Straight',
      'Texture': 'Silky Smooth',
      'Color': colorName(p.variants?.color),
      'Best For': 'Weaves, sew-in, quick weave styles',
      'Maintenance': 'Wide-tooth comb; light leave-in conditioner',
    }),
  },

  'wand-curls': {
    description: (p) =>
      `Wand Curl hair in ${colorName(p.variants?.color)} features perfectly formed, uniform spiral curls created by a wand styling technique. ` +
      `These bouncy, springy curls add instant glamour and volume, perfect for achieving a lush, full-coverage crochet install. ` +
      `The curls hold their shape beautifully and spring back after handling for a long-lasting style.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Crochet Hair',
      'Style': 'Wand Curl',
      'Texture': 'Spiral Curly',
      'Color': colorName(p.variants?.color),
      'Installation': 'Crochet braiding',
      'Best For': 'Crochet install, curly styles',
      'Maintenance': 'Spritz with water to refresh curls; avoid heat',
    }),
  },

  'afro-spring-twist': {
    description: (p) =>
      `Afro Spring Twist hair in ${colorName(p.variants?.color)} combines the fullness of afro-textured hair with the springy elasticity of passion twist fibres. ` +
      `The result is a lush, voluminous twist that looks incredibly natural and moves beautifully. ` +
      `Ideal for anyone with natural hair who wants a big, bold protective style.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Braiding Hair',
      'Style': 'Afro Spring Twist',
      'Texture': 'Afro / Springy',
      'Color': colorName(p.variants?.color),
      'Best For': 'Natural hair protective styles',
      'Maintenance': 'Finger-fluff to maintain volume; avoid heavy oils',
    }),
  },

  'soft-afro-bulk': {
    description: (p) =>
      `Soft Afro Bulk hair in ${colorName(p.variants?.color)} is a versatile, unprocessed bulk braiding hair with a soft afro texture. ` +
      `Suitable for braiding, twisting, locking, or adding volume to natural styles, this multi-purpose hair blends seamlessly with type 4 natural hair. ` +
      `A must-have staple for natural hair stylists.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Bulk Braiding Hair',
      'Style': 'Soft Afro Bulk',
      'Texture': 'Soft Afro / Kinky',
      'Color': colorName(p.variants?.color),
      'Best For': 'Braiding, twisting, locking, volume adding',
      'Maintenance': 'Moisturise lightly; keep twists or locs neatly sealed',
    }),
  },

  'river-box': {
    description: (p) =>
      `River Box braiding hair in ${colorName(p.variants?.color)} is a premium-quality braiding hair designed for beautiful, defined box braids. ` +
      `With a smooth texture and consistent weight distribution, River Box braids up easily and maintains a neat, polished finish. ` +
      `Durable and lightweight, it is the ideal choice for knotless or traditional box braid styles.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Braiding Hair',
      'Style': 'River Box Braids',
      'Texture': 'Smooth Straight',
      'Color': colorName(p.variants?.color),
      'Best For': 'Box braids (knotless and traditional), cornrows',
      'Maintenance': 'Dip ends in hot water to seal; moisturise scalp weekly',
    }),
  },

  'gogo-curls': {
    description: (p) =>
      `GoGo Curls in ${colorName(p.variants?.color)} feature a vibrant, spiral curl pattern that is full of personality and bounce. ` +
      `${p.variants?.length && p.variants.length !== 'N/A' ? `At ${p.variants.length}, they create a playful, full look that is easy to style. ` : ''}` +
      `An excellent choice for crochet installs where you want a fun, lively, curly aesthetic.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Crochet Hair',
      'Style': 'GoGo Curls',
      'Texture': 'Spiral Curly',
      'Color': colorName(p.variants?.color),
      ...(p.variants?.length && p.variants.length !== 'N/A' ? { 'Length': p.variants.length } : {}),
      'Installation': 'Crochet braiding',
      'Best For': 'Crochet curly installs',
      'Maintenance': 'Water spritz to refresh; finger-separate curls gently',
    }),
  },

  'italy-curls': {
    description: (p) =>
      `Italy Curls in ${colorName(p.variants?.color)} are inspired by the romantic, voluminous curls of Italian cosplay and fashion hair. ` +
      `Each strand features tightly packed, bouncy coils that create incredible fullness and dimension. ` +
      `These curls hold beautifully and are perfect for dramatic, head-turning crochet or weave styles.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Crochet / Extension Hair',
      'Style': 'Italy Curls',
      'Texture': 'Tight Coil / Bouncy',
      'Color': colorName(p.variants?.color),
      'Best For': 'Crochet styles, glamorous curly looks',
      'Maintenance': 'Spritz with water to restore bounce; avoid heat',
    }),
  },

  'bodywave': {
    description: (p) =>
      `Body Wave hair in ${colorName(p.variants?.color)} features soft, flowing S-shaped waves that add natural movement and glamour to any style. ` +
      `With a silky-smooth texture that catches the light beautifully, this hair looks effortlessly luxurious. ` +
      `Perfect for weave installs or as an addition to your natural hair for added length and volume.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Hair Extension',
      'Style': 'Body Wave',
      'Texture': 'Wavy / S-Pattern',
      'Color': colorName(p.variants?.color),
      'Best For': 'Weave, sew-in, quick weave',
      'Maintenance': 'Wide-tooth comb on dry hair; light anti-frizz serum',
    }),
  },

  'pretwisted': {
    description: (p) =>
      `Pretwisted hair in ${colorName(p.variants?.color)} comes with the twist already done, making installation incredibly fast and beginner-friendly. ` +
      `${p.variants?.length && p.variants.length !== 'N/A' ? `At ${p.variants.length}, these ready-to-install twists deliver a neat, uniform look in record time. ` : ''}` +
      `Simply attach to your cornrows for a full, beautiful twist hairstyle with minutes of effort.`,
    details: (p) => ({
      'Hair Type': 'Pre-twisted Synthetic Braiding Hair',
      'Style': 'Pretwisted',
      'Texture': 'Pre-formed twist',
      'Color': colorName(p.variants?.color),
      ...(p.variants?.length && p.variants.length !== 'N/A' ? { 'Length': p.variants.length } : {}),
      'Installation': 'Attach to cornrow base — no additional twisting needed',
      'Best For': 'Quick installs, beginners, protective styles',
      'Maintenance': 'Finger-detangle lightly; keep scalp clean and moisturised',
    }),
  },

  'vixen-hair': {
    description: (p) =>
      `Vixen Hair in ${colorName(p.variants?.color)} is a sleek, straight synthetic hair extension with a smooth, shiny finish that mirrors premium human hair. ` +
      `Lightweight and tangle-resistant, Vixen Hair drapes naturally and holds style well. ` +
      `An excellent all-rounder for weave, sew-in, or quick-weave installs.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Hair Extension',
      'Style': 'Vixen Straight',
      'Texture': 'Smooth / Glossy',
      'Color': colorName(p.variants?.color),
      'Best For': 'Weave, quick weave, sew-in styles',
      'Maintenance': 'Comb gently with wide-tooth comb; avoid tangling',
    }),
  },

  'afro-twist': {
    description: (p) =>
      `Afro Twist hair in ${colorName(p.variants?.color)} delivers a rich, full-textured twist that celebrates the beauty of natural afro hair. ` +
      `With a voluminous, coily profile, these twists create a bold, statement look that turns heads. ` +
      `Great for creating large, defined twists or adding texture to an existing natural style.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Braiding Hair',
      'Style': 'Afro Twist',
      'Texture': 'Coily / Afro',
      'Color': colorName(p.variants?.color),
      'Best For': 'Statement twists, natural hair looks',
      'Maintenance': 'Finger-separate for volume; avoid heavy products',
    }),
  },

  'human': {
    description: (p) =>
      `This premium human hair extension in ${colorName(p.variants?.color)} is sourced from real human hair, offering unmatched softness, natural movement, and styling versatility. ` +
      `Unlike synthetic options, human hair can be heat-styled, dyed, and treated like your own hair. ` +
      `A worthwhile investment for those who want the most natural, premium look and feel.`,
    details: (p) => ({
      'Hair Type': 'Human Hair',
      'Style': 'Straight',
      'Texture': 'Natural / Silky',
      'Color': colorName(p.variants?.color),
      'Heat Styling': 'Safe — straighten, curl, or wave as desired',
      'Best For': 'Maximum versatility, natural blending',
      'Maintenance': 'Shampoo and condition regularly; use heat protectant when styling',
    }),
  },

  'nubian-kids': {
    description: (p) =>
      `Nubian Kids hair in ${colorName(p.variants?.color)} is specially designed with children's delicate scalps in mind. ` +
      `Ultra-soft, lightweight fibres ensure maximum comfort during wear while the natural-looking finish keeps little ones looking adorable. ` +
      `Easy to install and gentle on fine, young hair.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Hair (Kids)',
      'Style': 'Nubian Kids',
      'Texture': 'Soft / Gentle',
      'Color': colorName(p.variants?.color),
      'Best For': "Children's protective styles",
      'Safety': 'Hypoallergenic fibres, lightweight for comfort',
      'Maintenance': 'Gentle detangling; keep moisturised',
    }),
  },

  'curl-braid': {
    description: (p) =>
      `Curl Braid hair in ${colorName(p.variants?.color)} fuses the classic definition of braids with lush, curly ends for a hybrid look that is both structured and playful. ` +
      `The unique curl-braid combo creates a striking style that works for box braids with curly tips, giving you the best of both worlds. ` +
      `Lightweight and long-lasting, this versatile hair suits a wide range of protective styles.`,
    details: (p) => ({
      'Hair Type': 'Synthetic Braiding / Crochet Hair',
      'Style': 'Curl Braid',
      'Texture': 'Curly-ended braids',
      'Color': colorName(p.variants?.color),
      'Best For': 'Box braids with curly ends, goddess braids, crochet installs',
      'Maintenance': 'Spritz curled ends with water to refresh; avoid heat',
    }),
  },
};

// ── Map handle → template key ───────────────────────────────────────────────
function getTemplateKey(handle) {
  if (!handle) return null;
  // Normalise: lowercase + replace spaces with hyphens so "CURL BRAID" → "curl-braid"
  const h = handle.toLowerCase().replace(/\s+/g, '-');
  const orderedKeys = Object.keys(HANDLE_TEMPLATES).sort((a, b) => b.length - a.length);
  for (const key of orderedKeys) {
    if (h.startsWith(key) || h.includes(key)) return key;
  }
  return null;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function run() {
  await connectDB();
  console.log(`\n🚀 Generating hair descriptions${DRY_RUN ? ' (DRY RUN)' : ''}...\n`);

  const products = await ProductModel.find({});
  console.log(`📦 Found ${products.length} products\n`);

  let updated = 0, skipped = 0, noTemplate = 0;

  for (const product of products) {
    const key = getTemplateKey(product.handle);
    if (!key) {
      console.warn(`  ⚠  No template for handle: "${product.handle}" — skipping`);
      noTemplate++;
      continue;
    }

    const tpl = HANDLE_TEMPLATES[key];
    const description = tpl.description(product);
    const more_details = tpl.details(product);

    if (DRY_RUN) {
      console.log(`\n[DRY] ${product.name} (${product._id})`);
      console.log(`  DESC: ${description.slice(0, 100)}…`);
      console.log(`  DETAILS:`, more_details);
      updated++;
      continue;
    }

    await ProductModel.updateOne(
      { _id: product._id },
      { $set: { description, more_details } }
    );
    updated++;

    if (updated % 50 === 0) process.stdout.write(`  ✅ ${updated} products updated…\r`);
  }

  console.log(`\n\n✅ Done!`);
  console.log(`   Updated  : ${updated}`);
  console.log(`   Skipped  : ${skipped}`);
  console.log(`   No template: ${noTemplate}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
