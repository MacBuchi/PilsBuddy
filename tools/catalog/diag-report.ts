// V8: adds up raw/web-diag-*.json (one file per crawl shard) into a Markdown report.
//   npx tsx tools/catalog/diag-report.ts [dir] > report.md
/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { diagnosisReport } from './diagnose'
import type { SiteRow } from './diagnose'

const dir = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), 'raw')
const rows: SiteRow[] = readdirSync(dir)
  .filter((f) => /^web-diag-\d+\.json$/.test(f))
  .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as SiteRow[])
process.stdout.write(diagnosisReport(rows))
