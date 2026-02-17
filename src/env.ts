import z from "zod";
import { zodParsePrettyErrors } from "./utility";

const env = zodParsePrettyErrors(
  "env",
  z.object({
    R2_ACCOUNT_ID: z.string(),
    R2_ACCESS_KEY_ID: z.string(),
    R2_SECRET_ACCESS_KEY: z.string(),
    R2_BUCKET_NAME: z.string(),
  }),
  process.env,
);

export default env;
