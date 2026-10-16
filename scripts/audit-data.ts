import { resolve } from "node:path";
import { loadDataBundle } from "../src/core/db/data-quality";
loadDataBundle(resolve(process.argv[2] || "data"))
  .then((bundle) =>
    console.log(
      JSON.stringify({
        passed: true,
        catalogue: bundle.catalogue.length,
        references: bundle.products.length,
        dictionary: bundle.dictionary.length,
        sourceHost: new URL(bundle.manifests.catalogue.sourceUrl).hostname,
      }),
    ),
  )
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Data validation failed",
    );
    process.exitCode = 1;
  });
