import z from "zod";

export function zodParsePrettyErrors<T>(
  label: string,
  schema: z.ZodType<T>,
  x: any,
): T {
  const result = schema.safeParse(x);
  if (!result.success) {
    console.log(
      `Error when parsing "${label}":\n${z.prettifyError(result.error)}`,
    );
    throw new Error(`parsing "${label}"`);
  }
  return result.data;
}

export function do_<T>(k: () => T): T {
  return k();
}
