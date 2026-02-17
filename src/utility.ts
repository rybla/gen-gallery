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

export async function batches<A>(
  items: Array<() => Promise<A>>,
  batch_size: number,
): Promise<Array<A>> {
  const results: Array<A> = [];
  for (let i = 0; i < items.length; i += batch_size) {
    const batch = items.slice(i, i + batch_size);
    const batchResults = await Promise.all(batch.map((f) => f()));
    results.push(...batchResults);
  }
  return results;
}
