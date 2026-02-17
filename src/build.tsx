import { renderToStaticMarkup } from "react-dom/server";
import { listAllObjects } from "./cloudflare";
import { site_title as app_title } from "./constants";
import { do_ } from "./utility";
import path from "path";

const output_dirpath = "dist";

type Page = {
  name: string;
  label: string;
  build: () => Promise<string>;
};

const pages: Page[] = [
  {
    name: "all_images",
    label: "All Images",
    async build() {
      // const objects = await listAllObjects("gen-image-all");

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
                <div className="menu-item"></div>
              </div>
            </body>
          </html>
        );
      }

      return `<!DOCTYPE html>${renderToStaticMarkup(<Index />)}`;
    },
  },
];

await Promise.all(
  pages.map(async (page) => {
    console.log(`building page: ${page.name}`);
    await Bun.file(path.join(output_dirpath, `${page.name}.html`)).write(
      await page.build(),
    );
  }),
);

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
                    {page.label}
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
