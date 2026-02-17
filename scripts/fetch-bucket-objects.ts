import { listAllObjects } from "../src/cloudflare";

listAllObjects("gen-image-all")
  .then((keys) => console.log(JSON.stringify(keys, null, 2)))
  .catch((err) => console.error(err));
