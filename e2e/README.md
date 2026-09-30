# End-to-end check

Drives the whole core flow in a headless iPhone-sized Chromium: welcome → onboarding → swipes →
DNA → avatar → match → detail → tabs → reload resumes → reset. Playwright is deliberately not a
project dependency; run it ad hoc:

```sh
npm run dev                                   # in one terminal
mkdir -p /tmp/pw && npm i --prefix /tmp/pw playwright@1.56.1
npx --prefix /tmp/pw playwright install chromium
cp e2e/flow.mjs /tmp/pw/ && node /tmp/pw/flow.mjs http://localhost:5173/ /tmp/pilsbuddy
```

The script has to sit next to a `node_modules/playwright` because ES module imports ignore
`npx -p` and `NODE_PATH`. Screenshots land at `/tmp/pilsbuddy-*.png`.
