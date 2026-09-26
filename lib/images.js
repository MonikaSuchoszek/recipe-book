// Responsive recipe photos, placeholder artwork and social preview images.
import Image from "@11ty/eleventy-img";
import { photoPath } from "./recipes.js";
import { withPrefix } from "./paths.js";

const OUTPUT = "docs";
const WIDTHS = [400, 800, 1600];

const escapeAttr = (value) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");

async function processPhoto(slug, file) {
  return Image(photoPath(slug, file), {
    widths: WIDTHS,
    formats: ["webp"],
    outputDir: `${OUTPUT}/assets/images/recipes/${slug}/`,
    urlPath: withPrefix(`/assets/images/recipes/${slug}/`),
  });
}

/** Where each image variant appears, so the browser picks a fitting width. */
const SIZES = {
  header: "(min-width: 1024px) 960px, 100vw",
  card: "(min-width: 1024px) 320px, (min-width: 640px) 45vw, 100vw",
  thumb: "96px",
  gallery: "(min-width: 640px) 160px, 30vw",
};

/**
 * <img> for a recipe's main photo, or its placeholder illustration.
 * `recipe.image` comes from recipes.11tydata.js.
 */
export async function recipeImage(image, variant, alt = "") {
  const eager = variant === "header";
  const loading = eager ? `fetchpriority="high"` : `loading="lazy"`;
  const style = image.position && image.position !== "center" ? ` style="object-position: ${escapeAttr(image.position)}"` : "";
  if (image.placeholder) {
    return `<img src="${image.src}" alt="" width="400" height="300" ${loading} decoding="async" class="is-illustration"${style}>`;
  }
  const metadata = await processPhoto(image.slug, image.file);
  const webp = metadata.webp;
  const largest = webp.at(-1);
  const srcset = webp.map((entry) => entry.srcset).join(", ");
  return `<img src="${webp[0].url}" srcset="${srcset}" sizes="${SIZES[variant]}" alt="${escapeAttr(alt)}" width="${largest.width}" height="${largest.height}" ${loading} decoding="async"${style}>`;
}

/** Full size gallery photo plus a small square thumbnail. */
export async function galleryImage(slug, file) {
  const metadata = await processPhoto(slug, file);
  const webp = metadata.webp;
  return { thumb: webp[0], full: webp.at(-1), srcset: webp.map((entry) => entry.srcset).join(", ") };
}

/** Path to the image the planner stores for an entry (a small photo or the placeholder). */
export async function plannerImage(image) {
  if (image.placeholder) return image.src;
  const metadata = await processPhoto(image.slug, image.file);
  return metadata.webp[0].url;
}

/** Social previews need a raster image; placeholders are rendered from their SVG. */
export async function socialImage(image) {
  const source = image.placeholder ? `src/assets/illustrations/${image.illustration}` : photoPath(image.slug, image.file);
  const metadata = await Image(source, {
    widths: [1200],
    formats: [image.placeholder ? "png" : "jpeg"],
    outputDir: `${OUTPUT}/assets/images/social/`,
    urlPath: withPrefix("/assets/images/social/"),
    svgShortCircuit: false,
  });
  return Object.values(metadata)[0][0];
}

/** favicon-32.png and apple-touch-icon.png, rendered from favicon.svg. */
export async function renderFavicons() {
  const render = (width, name, flatten) =>
    Image("src/assets/illustrations/favicon.svg", {
      widths: [width],
      formats: ["png"],
      outputDir: OUTPUT,
      urlPath: "/",
      filenameFormat: () => name,
      // iOS draws transparent corners black, so the touch icon gets a solid background
      transform: flatten ? (sharp) => sharp.flatten({ background: "#2F9E6E" }) : undefined,
    });
  await Promise.all([render(32, "favicon-32.png", false), render(180, "apple-touch-icon.png", true)]);
}
