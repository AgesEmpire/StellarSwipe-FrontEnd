import { buildSignalPage } from "@/lib/signals";
import { BookmarksPage } from "@/components/bookmarks/BookmarksPage";

export default function BookmarksRoute() {
  const initialSignals = buildSignalPage(1, 50).items;

  return <BookmarksPage initialSignals={initialSignals} />;
}
