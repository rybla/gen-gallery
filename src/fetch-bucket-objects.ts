import { listAllObjects } from "./cloudflare";
import env from "./env";

listAllObjects(env.R2_BUCKET_NAME)
  .then((keys) => console.log(JSON.stringify(keys, null, 2)))
  .catch((err) => console.error(err));
