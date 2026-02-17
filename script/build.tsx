import { DynamicCommandLineParser } from "@rushstack/ts-command-line";
import fs from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import z from "zod";
import { listAllObjects } from "../src/cloudflare";
import { site_title as app_title } from "../src/constants";
import { do_, zodParsePrettyErrors } from "../src/utility";

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
                {objects.map((name, i) => (
                  <div className="gallery-item" key={i}>
                    <img
                      className="gallery-item-img"
                      loading={lazy_threashold_index <= i ? "eager" : "lazy"}
                      src={`${public_development_url}/${name}`}
                    ></img>
                  </div>
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
          </head>
          <body>
            <div className="title">{app_title}</div>
            <div className="menu">
              <div className="menu-item">
                {pages.map((page, i) => (
                  <a href={`/${page.name}.html`} key={i}>
                    {page.title}
                  </a>
                ))}
              </div>
            </div>
          </body>
        </html>
      );
    }

    return `<!DOCTYPE html>${renderToStaticMarkup(<Index />)}`;
  }),
);
