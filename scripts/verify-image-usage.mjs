import fs from "node:fs";
import path from "node:path";

const roots = ["app", "components"];
const imageExtensions = new Set([
  ".apng",
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return fullPath;
  });
}

const sourceFiles = roots
  .flatMap(walk)
  .filter((file) => /\.(tsx|ts|jsx|js|css)$/.test(file));

const plainImageTagFiles = [];
const cssImageFiles = [];

for (const file of sourceFiles) {
  const contents = fs.readFileSync(file, "utf8");
  if (/<img\b/.test(contents)) {
    plainImageTagFiles.push(file);
  }
  if (/background-image\s*:|url\(\s*['"]?[^)'"]+\.(png|jpe?g|webp|avif|gif|svg)/i.test(contents)) {
    cssImageFiles.push(file);
  }
}

const publicImageFiles = walk("public").filter((file) =>
  imageExtensions.has(path.extname(file).toLowerCase())
);

assert(
  plainImageTagFiles.length === 0,
  `plain <img> tags found: ${plainImageTagFiles.join(", ")}`
);
assert(
  cssImageFiles.length === 0,
  `CSS image backgrounds found: ${cssImageFiles.join(", ")}`
);
assert(
  publicImageFiles.length === 0,
  `public image assets need explicit audit: ${publicImageFiles.join(", ")}`
);

const docs = fs.readFileSync("docs/image-usage.md", "utf8");
assert(docs.includes("next/image"), "audit documents next/image policy");
assert(docs.includes("priority"), "audit documents above-the-fold priority policy");
assert(docs.includes("sizes"), "audit documents responsive sizes policy");
assert(docs.includes("Lighthouse"), "audit documents Lighthouse image review");
assert(docs.includes("No current image elements"), "audit records current image inventory");

console.log("image usage audit verified");
