import {
  groupIngredients,
  hasMethod,
  normalizeIngredients,
  normalizeServings,
  recipeImageInfo,
  resolveTerms,
} from "../../lib/recipes.js";
import { galleryImage, plannerImage, recipeImage, socialImage } from "../../lib/images.js";

const imageInfo = (data) => recipeImageInfo(data, data.page.fileSlug, resolveTerms(data).categories);

export default {
  layout: "layouts/recipe.njk",
  // URLs come only from the file name, so retitling or re-tagging never breaks a link.
  // A permalink in a recipe's own frontmatter is rejected by lib/validate-recipes.js.
  permalink: (data) => `/recipes/${data.page.fileSlug}/`,
  eleventyComputed: {
    recipe: (data) => {
      const slug = data.page.fileSlug;
      const { categories, tags } = resolveTerms(data);
      const ingredients = normalizeIngredients(data.ingredients);
      return {
        slug,
        categories,
        tags,
        primary: categories[0],
        servings: normalizeServings(data.servings),
        ingredients,
        ingredientGroups: groupIngredients(ingredients),
        image: imageInfo(data),
        hasMethod: hasMethod(data.page.rawInput),
      };
    },
    // Image markup is prepared here because templates can't await inside loops
    media: async (data) => {
      const image = imageInfo(data);
      const [header, card, thumbnail, gallery] = await Promise.all([
        recipeImage(image, "header", data.title),
        recipeImage(image, "card", data.title),
        plannerImage(image),
        Promise.all(
          (data.gallery ?? []).map(async (photo) => ({
            caption: photo.caption ?? "",
            ...(await galleryImage(data.page.fileSlug, photo.file)),
          })),
        ),
      ]);
      return { header, card, thumbnail, gallery };
    },
    socialImage: (data) => socialImage(imageInfo(data)),
  },
};
