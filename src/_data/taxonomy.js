// Single source of truth for categories and tags.
// Recipes may only use names listed here; the build explains how to add new ones.
export default {
  // Named colours, reusable below. Terms may also use a hex value directly.
  palette: {
    leaf: "#2F9E6E", herb: "#5E8C3A", avocado: "#8DB63C", teal: "#2BA3A0",
    sky: "#4AA8D8", plum: "#8E6CC9", berry: "#E8546B", tomato: "#E4583A",
    carrot: "#F28C38", citrus: "#F6B73C", oat: "#C9A46A", rose: "#D9609B",
  },

  categories: [
    { name: "Breakfast",        color: "citrus",  illustration: "breakfast.svg" },
    { name: "Main",             color: "tomato",  illustration: "main.svg" },
    { name: "Soup",             color: "carrot",  illustration: "soup.svg" },
    { name: "Salad",            color: "leaf",    illustration: "salad.svg" },
    { name: "Side",             color: "teal",    illustration: "side.svg" },
    { name: "Snack",            color: "plum",    illustration: "snack.svg" },
    { name: "Baking",           color: "oat",     illustration: "baking.svg" },
    { name: "Cake",             color: "rose",    illustration: "cake.svg" },
    { name: "Dessert",          color: "berry",   illustration: "dessert.svg" },
    { name: "Drink",            color: "sky",     illustration: "drink.svg" },
    { name: "Sauce & Dressing", color: "herb",    illustration: "sauce.svg",
      slug: "sauce-dressing" },
  ],

  tagGroups: [
    { name: "Diet", color: "leaf", tags: [
      { name: "vegetarian" }, { name: "vegan" }, { name: "gluten-free" },
      { name: "dairy-free" }, { name: "high-protein" },
    ]},
    { name: "Effort", color: "sky", tags: [
      { name: "quick", description: "Ready in under 30 minutes" },
      { name: "one-pot" }, { name: "make-ahead" },
      { name: "freezer-friendly" }, { name: "lunchbox" },
    ]},
    { name: "Main ingredient", color: "carrot", tags: [
      { name: "legumes" }, { name: "fish" }, { name: "chicken" },
      { name: "tofu" }, { name: "whole grains" }, { name: "eggs" },
    ]},
    { name: "Season", color: "teal", tags: [
      { name: "spring", color: "avocado" }, { name: "summer", color: "citrus" },
      { name: "autumn", color: "carrot" },  { name: "winter", color: "sky" },
    ]},
    { name: "Audience", color: "berry", tags: [
      { name: "kid-friendly" },
    ]},
  ],
};
