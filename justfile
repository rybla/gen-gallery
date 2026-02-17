build:
  bun run scripts/build.tsx --cache

build_fetch:
  bun run scripts/build.tsx

deploy: build
  bun gh-pages -d dist --nojekyll
