# End-to-end check

Drives the whole core flow in a headless iPhone-sized Chromium: welcome → onboarding → swipes →
DNA → avatar → match → detail → tabs → reload resumes → reset. Playwright is deliberately not a
project dependency; run it ad hoc:

```sh
npm run dev                      # in one terminal
npx -y -p playwright@1.56.1 node e2e/flow.mjs http://localhost:5173/ /tmp/pilsbuddy
```

Screenshots land at `/tmp/pilsbuddy-*.png`. Browsers: `npx -y playwright@1.56.1 install chromium`.
