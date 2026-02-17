build:
  bun run script/build.ts --cache

build_fetch:
  bun run script/build.ts

deploy: build
  bun gh-pages -d dist --nojekyll
