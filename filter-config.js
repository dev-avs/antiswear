// ============================================================
//  filter-config.js  –  Edit your word replacements here
// ============================================================

const wordFilter = [
  { match: /\bexample\b/gi,        replace: "replacementexample"            },
  // Add more rules here:
  // { match: /your_word/gi, replace: "replacement" },
];

module.exports = wordFilter;