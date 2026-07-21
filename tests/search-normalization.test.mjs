import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadSearchModule() {
  const source = await readFile(new URL("../lib/search.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  Function("exports", "module", output)(loadedModule.exports, loadedModule);
  return loadedModule.exports;
}

test("normalizes Vietnamese hashtag searches", async () => {
  const { normalizeSearchText } = await loadSearchModule();

  assert.equal(normalizeSearchText("#Mì Quảng"), "mi quang");
  assert.equal(normalizeSearchText("mi quang"), "mi quang");
  assert.equal(normalizeSearchText("#MÌ QUẢNG"), "mi quang");
  assert.equal(normalizeSearchText("＃ＭÌ QUẢNG"), "mi quang");
  assert.equal(normalizeSearchText("#Bún   riêu"), "bun rieu");
});
