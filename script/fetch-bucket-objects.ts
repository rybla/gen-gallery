import { listAllObjects } from "../src/cloudflare";
import env from "../src/env";

listAllObjects(env.R2_BUCKET_NAME)
  .then((keys) => console.log(JSON.stringify(keys, null, 2)))
  .catch((err) => console.error(err));
