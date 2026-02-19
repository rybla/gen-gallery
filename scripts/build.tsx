import { listAllObjects } from "@/cloudflare";
import {
  site_title as app_title,
  public_prefix as public_relative_url_prefix,
} from "@/constants";
import { getRemoteImageDimensions } from "@/local_utilities";
import { batches, do_, zodParsePrettyErrors } from "@/utility";
import { DynamicCommandLineParser } from "@rushstack/ts-command-line";
import fs from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import z from "zod";

// -----------------------------------------------------------------------------

const public_dirpath = "public";
const output_dirpath = "dist";
const cache_dirpath = "cache";

const bucket_name = "gen-image-all";
const public_development_url =
  "https://pub-232f9aa938d64458b3360607cda3228f.r2.dev";

// -----------------------------------------------------------------------------

const clp: DynamicCommandLineParser = new DynamicCommandLineParser({
  toolFilename: import.meta.file,
  toolDescription: "Builds the static website.",
});

clp.defineFlagParameter({
  parameterLongName: "--cache",
  description:
    "Use caches rather than fetching latests bucket contents from Cloudflare.",
});

await clp.executeAsync();

const cacheEnabled = clp.getFlagParameter("--cache").value;

// -----------------------------------------------------------------------------

async function useCache<A>(
  name: string,
  schema: z.ZodType<A>,
  generate: () => Promise<A>,
): Promise<A> {
  const cache_filepath = path.join(cache_dirpath, name);
  if (cacheEnabled) {
    console.log(`using cached ${name}`);
    const content = await Bun.file(cache_filepath).text();
    const data = zodParsePrettyErrors(
      `cache ${name}`,
      schema,
      JSON.parse(content),
    );
    return data;
  } else {
    console.log(`generating ${name}`);
    const data = await generate();
    await Bun.file(cache_filepath).write(JSON.stringify(data, null, 4));
    return data;
  }
}

// -----------------------------------------------------------------------------

fs.rmSync("dist", { recursive: true, force: true });
fs.cpSync("public", "dist", { recursive: true });

// -----------------------------------------------------------------------------

type PageBase = {
  name: string;
  title: string;
};

type Page = PageBase & {
  build: (page: PageBase) => Promise<string>;
};

const pages: Page[] = [
  {
    name: "all_images",
    title: "All Images",
    async build(page) {
      const objects = await useCache(
        `${page.name} objects`,
        z.array(z.string()),
        async () => {
          return await listAllObjects(bucket_name);
        },
      );

      // cache this on a per-object basis so can be updated incrementally as I add more objects to the bucket
      const objectsWithMetadata = await useCache(
        `${page.name} objectsWithMetadata`,
        z.array(
          z.object({
            name: z.string(),
            url: z.string(),
            dimensions: z.optional(
              z.object({ height: z.number(), width: z.number() }),
            ),
          }),
        ),
        async () =>
          await batches(
            objects.map((name) => async () => {
              console.log(`getting metadata for object ${name}`);
              const url = `${public_development_url}/${name}`;
              const dimensions = await do_(async () => {
                try {
                  return await getRemoteImageDimensions(url);
                } catch (error: unknown) {
                  if (error instanceof Error) {
                    console.error(error.message);
                  } else {
                    console.error(error);
                  }
                  return undefined;
                }
              });
              return { name, url, dimensions };
            }),
            100,
          ),
      );

      const lazy_threashold_index = 4;

      function GalleryPage(props: {}) {
        return (
          <html lang="en">
            <head>
              <meta charSet="utf-8" />
              <title>{app_title}</title>
              <link rel="stylesheet" href="/all_images.css"></link>
            </head>
            <body>
              <div className="title">{`${app_title} | ${page.title}`}</div>
              <div className="gallery">
                {objectsWithMetadata.map((object, i) => (
                  <img
                    className="gallery-item-img"
                    key={i}
                    loading={lazy_threashold_index <= i ? "lazy" : "eager"}
                    height={object.dimensions?.height}
                    width={object.dimensions?.width}
                    src={`${public_development_url}/${object.name}`}
                  />
                ))}
              </div>
            </body>
          </html>
        );
      }

      return `<!DOCTYPE html>${renderToStaticMarkup(<GalleryPage />)}`;
    },
  },
];

await Promise.all(
  pages.map(async (page) => {
    console.log(`building page: ${page.name}`);
    await Bun.file(path.join(output_dirpath, `${page.name}.html`)).write(
      await page.build(page),
    );
  }),
);

// -----------------------------------------------------------------------------

console.log(`building index`);
await Bun.file(path.join(output_dirpath, "index.html")).write(
  await do_(async () => {
    function Index(props: {}) {
      return (
        <html lang="en">
          <head>
            <meta charSet="utf-8" />
            <title>{app_title}</title>
            <link rel="stylesheet" href="/index.css"></link>
          </head>
          <body>
            <div className="title">{app_title}</div>
            <ul className="menu">
              {pages.map((page, i) => (
                <li key={i}>
                  <a href={`/${public_relative_url_prefix}/${page.name}.html`}>
                    {page.title}
                  </a>
                </li>
              ))}
            </ul>
          </body>
        </html>
      );
    }

    return `<!DOCTYPE html>${renderToStaticMarkup(<Index />)}`;
  }),
);
