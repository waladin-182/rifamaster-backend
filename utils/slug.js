const slugify = require("slugify");
const Raffle = require("../models/Raffle");

async function generateUniqueSlug(title) {
  const base = slugify(title, { lower: true, strict: true }).slice(0, 60) || "rifa";
  let candidate = base;
  let attempt = 0;

  while (await Raffle.exists({ slug: candidate })) {
    attempt += 1;
    const suffix = Math.random().toString(36).slice(2, 6);
    candidate = `${base}-${suffix}`;
    if (attempt > 10) break;
  }

  return candidate;
}

module.exports = { generateUniqueSlug };
