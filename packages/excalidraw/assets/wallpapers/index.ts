import type { WallpaperCategory } from "../../recording/types";

export interface Wallpaper {
  id: string;
  category: "vibrant" | "soft" | "dark" | "nature";
  name: string;
  src: string;
  thumbnail: string;
}

export const wallpapers: Wallpaper[] = [
  // Vibrant (鲜艳)
  {
    id: "ocean-lime",
    category: "vibrant",
    name: "Ocean Lime",
    src: "/wallpapers/thumbs/ocean-lime.jpg",
    thumbnail: "/wallpapers/thumbs/ocean-lime.jpg",
  },
  {
    id: "sunset-rainbow",
    category: "vibrant",
    name: "Sunset Rainbow",
    src: "/wallpapers/thumbs/sunset-rainbow.jpg",
    thumbnail: "/wallpapers/thumbs/sunset-rainbow.jpg",
  },
  {
    id: "tropical-burst",
    category: "vibrant",
    name: "Tropical Burst",
    src: "/wallpapers/thumbs/tropical-burst.jpg",
    thumbnail: "/wallpapers/thumbs/tropical-burst.jpg",
  },
  {
    id: "neon-wave",
    category: "vibrant",
    name: "Neon Wave",
    src: "/wallpapers/thumbs/neon-wave.jpg",
    thumbnail: "/wallpapers/thumbs/neon-wave.jpg",
  },
  {
    id: "texture-orange-diagonal",
    category: "vibrant",
    name: "Orange Texture",
    src: "/wallpapers/thumbs/texture-orange-diagonal.jpg",
    thumbnail: "/wallpapers/thumbs/texture-orange-diagonal.jpg",
  },
  {
    id: "geometric-teal-kaleidoscope",
    category: "vibrant",
    name: "Teal Kaleidoscope",
    src: "/wallpapers/thumbs/geometric-teal-kaleidoscope.jpg",
    thumbnail: "/wallpapers/thumbs/geometric-teal-kaleidoscope.jpg",
  },
  {
    id: "geometric-blue-hexagons",
    category: "vibrant",
    name: "Blue Hexagons",
    src: "/wallpapers/thumbs/geometric-blue-hexagons.jpg",
    thumbnail: "/wallpapers/thumbs/geometric-blue-hexagons.jpg",
  },
  {
    id: "geometric-pink-blue-triangles",
    category: "vibrant",
    name: "Pink Blue Triangles",
    src: "/wallpapers/thumbs/geometric-pink-blue-triangles.jpg",
    thumbnail: "/wallpapers/thumbs/geometric-pink-blue-triangles.jpg",
  },
  {
    id: "geometric-green-weave",
    category: "vibrant",
    name: "Green Weave",
    src: "/wallpapers/thumbs/geometric-green-weave.jpg",
    thumbnail: "/wallpapers/thumbs/geometric-green-weave.jpg",
  },
  {
    id: "tiles-moroccan",
    category: "vibrant",
    name: "Moroccan Tiles",
    src: "/wallpapers/thumbs/tiles-moroccan.jpg",
    thumbnail: "/wallpapers/thumbs/tiles-moroccan.jpg",
  },
  {
    id: "pattern-fish-scales",
    category: "vibrant",
    name: "Fish Scales",
    src: "/wallpapers/thumbs/pattern-fish-scales.jpg",
    thumbnail: "/wallpapers/thumbs/pattern-fish-scales.jpg",
  },
  {
    id: "glitter-colorful-diagonal",
    category: "vibrant",
    name: "Colorful Glitter",
    src: "/wallpapers/thumbs/glitter-colorful-diagonal.jpg",
    thumbnail: "/wallpapers/thumbs/glitter-colorful-diagonal.jpg",
  },
  {
    id: "paper-colorful-blocks",
    category: "vibrant",
    name: "Paper Blocks",
    src: "/wallpapers/thumbs/paper-colorful-blocks.jpg",
    thumbnail: "/wallpapers/thumbs/paper-colorful-blocks.jpg",
  },
  {
    id: "paper-yellow-blue",
    category: "vibrant",
    name: "Yellow Blue Paper",
    src: "/wallpapers/thumbs/paper-yellow-blue.jpg",
    thumbnail: "/wallpapers/thumbs/paper-yellow-blue.jpg",
  },
  {
    id: "wood-colorful-planks",
    category: "vibrant",
    name: "Colorful Wood",
    src: "/wallpapers/thumbs/wood-colorful-planks.jpg",
    thumbnail: "/wallpapers/thumbs/wood-colorful-planks.jpg",
  },
  {
    id: "abstract-blue-orange",
    category: "vibrant",
    name: "Blue Orange Abstract",
    src: "/wallpapers/thumbs/abstract-blue-orange.jpg",
    thumbnail: "/wallpapers/thumbs/abstract-blue-orange.jpg",
  },
  {
    id: "abstract-colorful-paint",
    category: "vibrant",
    name: "Colorful Paint",
    src: "/wallpapers/thumbs/abstract-colorful-paint.jpg",
    thumbnail: "/wallpapers/thumbs/abstract-colorful-paint.jpg",
  },
  {
    id: "abstract-warm-paint",
    category: "vibrant",
    name: "Warm Paint",
    src: "/wallpapers/thumbs/abstract-warm-paint.jpg",
    thumbnail: "/wallpapers/thumbs/abstract-warm-paint.jpg",
  },

  // Soft (柔和)
  {
    id: "cotton-candy",
    category: "soft",
    name: "Cotton Candy",
    src: "/wallpapers/thumbs/cotton-candy.jpg",
    thumbnail: "/wallpapers/thumbs/cotton-candy.jpg",
  },
  {
    id: "morning-mist",
    category: "soft",
    name: "Morning Mist",
    src: "/wallpapers/thumbs/morning-mist.jpg",
    thumbnail: "/wallpapers/thumbs/morning-mist.jpg",
  },
  {
    id: "paper-petals",
    category: "soft",
    name: "Paper Petals",
    src: "/wallpapers/thumbs/paper-petals.jpg",
    thumbnail: "/wallpapers/thumbs/paper-petals.jpg",
  },
  {
    id: "soft-prism",
    category: "soft",
    name: "Soft Prism",
    src: "/wallpapers/thumbs/soft-prism.jpg",
    thumbnail: "/wallpapers/thumbs/soft-prism.jpg",
  },
  {
    id: "lemon-lavender",
    category: "soft",
    name: "Lemon Lavender",
    src: "/wallpapers/thumbs/lemon-lavender.jpg",
    thumbnail: "/wallpapers/thumbs/lemon-lavender.jpg",
  },
  {
    id: "rose-garden",
    category: "soft",
    name: "Rose Garden",
    src: "/wallpapers/thumbs/rose-garden.jpg",
    thumbnail: "/wallpapers/thumbs/rose-garden.jpg",
  },
  {
    id: "fabric-teal",
    category: "soft",
    name: "Teal Fabric",
    src: "/wallpapers/thumbs/fabric-teal.jpg",
    thumbnail: "/wallpapers/thumbs/fabric-teal.jpg",
  },
  {
    id: "paper-crumpled-white",
    category: "soft",
    name: "Crumpled Paper",
    src: "/wallpapers/thumbs/paper-crumpled-white.jpg",
    thumbnail: "/wallpapers/thumbs/paper-crumpled-white.jpg",
  },
  {
    id: "pattern-floral-fabric",
    category: "soft",
    name: "Floral Fabric",
    src: "/wallpapers/thumbs/pattern-floral-fabric.jpg",
    thumbnail: "/wallpapers/thumbs/pattern-floral-fabric.jpg",
  },
  {
    id: "textile-crochet-squares",
    category: "soft",
    name: "Crochet Squares",
    src: "/wallpapers/thumbs/textile-crochet-squares.jpg",
    thumbnail: "/wallpapers/thumbs/textile-crochet-squares.jpg",
  },
  {
    id: "textile-embroidery",
    category: "soft",
    name: "Embroidery",
    src: "/wallpapers/thumbs/textile-embroidery.jpg",
    thumbnail: "/wallpapers/thumbs/textile-embroidery.jpg",
  },
  {
    id: "abstract-distressed-beige",
    category: "soft",
    name: "Distressed Beige",
    src: "/wallpapers/thumbs/abstract-distressed-beige.jpg",
    thumbnail: "/wallpapers/thumbs/abstract-distressed-beige.jpg",
  },
  {
    id: "abstract-painted-wall",
    category: "soft",
    name: "Painted Wall",
    src: "/wallpapers/thumbs/abstract-painted-wall.jpg",
    thumbnail: "/wallpapers/thumbs/abstract-painted-wall.jpg",
  },

  // Dark (暗色)
  {
    id: "midnight-glow",
    category: "dark",
    name: "Midnight Glow",
    src: "/wallpapers/thumbs/midnight-glow.jpg",
    thumbnail: "/wallpapers/thumbs/midnight-glow.jpg",
  },
  {
    id: "northern-lights",
    category: "dark",
    name: "Northern Lights",
    src: "/wallpapers/thumbs/northern-lights.jpg",
    thumbnail: "/wallpapers/thumbs/northern-lights.jpg",
  },
  {
    id: "flowers-pink-dark",
    category: "dark",
    name: "Pink Flowers Dark",
    src: "/wallpapers/thumbs/flowers-pink-dark.jpg",
    thumbnail: "/wallpapers/thumbs/flowers-pink-dark.jpg",
  },
  {
    id: "velvet-green",
    category: "dark",
    name: "Green Velvet",
    src: "/wallpapers/thumbs/velvet-green.jpg",
    thumbnail: "/wallpapers/thumbs/velvet-green.jpg",
  },
  {
    id: "brick-red-wall",
    category: "dark",
    name: "Red Brick",
    src: "/wallpapers/thumbs/brick-red-wall.jpg",
    thumbnail: "/wallpapers/thumbs/brick-red-wall.jpg",
  },

  // Nature (自然)
  {
    id: "alpine-moonrise",
    category: "nature",
    name: "Alpine Moonrise",
    src: "/wallpapers/thumbs/alpine-moonrise.jpg",
    thumbnail: "/wallpapers/thumbs/alpine-moonrise.jpg",
  },
  {
    id: "golden-hour",
    category: "nature",
    name: "Golden Hour",
    src: "/wallpapers/thumbs/golden-hour.jpg",
    thumbnail: "/wallpapers/thumbs/golden-hour.jpg",
  },
  {
    id: "tropical-leaves",
    category: "nature",
    name: "Tropical Leaves",
    src: "/wallpapers/thumbs/tropical-leaves.jpg",
    thumbnail: "/wallpapers/thumbs/tropical-leaves.jpg",
  },
  {
    id: "fresh-leaves",
    category: "nature",
    name: "Fresh Leaves",
    src: "/wallpapers/thumbs/fresh-leaves.jpg",
    thumbnail: "/wallpapers/thumbs/fresh-leaves.jpg",
  },
  {
    id: "eucalyptus",
    category: "nature",
    name: "Eucalyptus",
    src: "/wallpapers/thumbs/eucalyptus.jpg",
    thumbnail: "/wallpapers/thumbs/eucalyptus.jpg",
  },
  {
    id: "blue-florals",
    category: "nature",
    name: "Blue Florals",
    src: "/wallpapers/thumbs/blue-florals.jpg",
    thumbnail: "/wallpapers/thumbs/blue-florals.jpg",
  },
  {
    id: "nature-mountain-lake",
    category: "nature",
    name: "Mountain Lake",
    src: "/wallpapers/thumbs/nature-mountain-lake.jpg",
    thumbnail: "/wallpapers/thumbs/nature-mountain-lake.jpg",
  },
  {
    id: "flowers-blue-orange",
    category: "nature",
    name: "Blue Orange Flowers",
    src: "/wallpapers/thumbs/flowers-blue-orange.jpg",
    thumbnail: "/wallpapers/thumbs/flowers-blue-orange.jpg",
  },
  {
    id: "flowers-scattered-white",
    category: "nature",
    name: "Scattered Flowers",
    src: "/wallpapers/thumbs/flowers-scattered-white.jpg",
    thumbnail: "/wallpapers/thumbs/flowers-scattered-white.jpg",
  },
];

export const getWallpaperById = (id: string): Wallpaper | undefined => {
  return wallpapers.find((w) => w.id === id);
};

export const getWallpapersByCategory = (
  category: WallpaperCategory,
): Wallpaper[] => {
  if (category === "all") {
    return wallpapers;
  }
  return wallpapers.filter((w) => w.category === category);
};
