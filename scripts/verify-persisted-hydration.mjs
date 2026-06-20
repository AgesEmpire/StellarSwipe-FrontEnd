import fs from "node:fs";
import path from "node:path";

const storeDir = "store";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const storeFiles = fs
  .readdirSync(storeDir)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => path.join(storeDir, file));

const persistedStoreFiles = storeFiles.filter((file) =>
  fs.readFileSync(file, "utf8").includes("persist(")
);

assert(persistedStoreFiles.length > 0, "expected persisted Zustand stores");

for (const file of persistedStoreFiles) {
  const source = fs.readFileSync(file, "utf8");
  assert(
    source.includes("createPersistedState") &&
      source.includes("withPersistedHydration"),
    `${file} must use the shared persisted hydration helper`
  );
  assert(
    source.includes("PersistHydrationState"),
    `${file} must expose isHydrated through PersistHydrationState`
  );
}

const helper = fs.readFileSync("store/persistHydration.ts", "utf8");
assert(
  helper.includes("skipHydration: true"),
  "shared hydration helper must opt persisted stores out of sync localStorage hydration"
);
assert(
  helper.includes("partialize") &&
    helper.includes("isHydrated") &&
    helper.includes("setHydrated"),
  "shared hydration helper must keep runtime hydration flags out of persisted storage"
);

const hydrationComponent = fs.readFileSync(
  "components/PersistedStoreHydration.tsx",
  "utf8"
);

for (const file of persistedStoreFiles) {
  const exportName = path.basename(file, ".ts");
  assert(
    hydrationComponent.includes(exportName),
    `PersistedStoreHydration must rehydrate ${exportName}`
  );
}

const layout = fs.readFileSync("app/layout.tsx", "utf8");
assert(
  layout.includes("<PersistedStoreHydration />"),
  "Root layout must mount PersistedStoreHydration"
);

const docs = fs.readFileSync("docs/persisted-store-hydration.md", "utf8");
assert(
  docs.includes("skipHydration") && docs.includes("isHydrated"),
  "hydration docs must describe skipHydration and isHydrated"
);

console.log(
  `persisted hydration verified for ${persistedStoreFiles.length} stores`
);
