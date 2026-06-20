import { existsSync, readFileSync } from "node:fs";

const pagePath = "app/bookmarks/page.tsx";
const page = existsSync(pagePath) ? readFileSync(pagePath, "utf8") : "";
const navbar = readFileSync("components/Navbar.tsx", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

const failures = [];

if (!existsSync(pagePath)) {
  failures.push("Missing dedicated /bookmarks page");
}

const requiredPageSnippets = [
  "useBookmarkStore",
  "useSignalsFeed",
  "bookmarks.includes(signal.id)",
  "Bookmarked Signals",
  "No bookmarked signals yet",
  "toggleBookmark(signal.id)",
  "aria-label={`Remove ${signal.ticker} from bookmarks`}",
  "aria-expanded={expandedSignalId === signal.id}",
  "setTradeSignal(signal)",
  "<TradeModal",
];

for (const snippet of requiredPageSnippets) {
  if (!page.includes(snippet)) {
    failures.push(`Missing bookmark page behavior: ${snippet}`);
  }
}

if (!navbar.includes('href: "/bookmarks"') || !navbar.includes('label: "Bookmarks"')) {
  failures.push("Navbar does not expose a Bookmarks navigation entry");
}

if (!packageJson.scripts?.["verify:bookmarked-signals"]) {
  failures.push("Missing verify:bookmarked-signals npm script");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Bookmarked signals page verified.");
