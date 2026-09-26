import { socialImage } from "../../lib/images.js";

// Pages without a photo of their own share the home page hero as social preview.
// Recipe pages override this in recipes.11tydata.js.
export default {
  socialImage: () => socialImage({ placeholder: true, illustration: "hero.svg" }),
};
