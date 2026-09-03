import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { extractLinksText } from "../src/artifact.js";

test("extracts only root links.txt and never returns diagnostics", () => {
  const zip = zipSync({
    "links.txt": strToU8("https://images.example.test/one.jpg\n"),
    "diagnostics.txt": strToU8("private diagnostic fixture"),
  });
  const result = extractLinksText(zip);
  assert.equal(result, "https://images.example.test/one.jpg\n");
  assert.equal(result.includes("private diagnostic fixture"), false);
});

test("rejects an archive without root links.txt", () => {
  const zip = zipSync({ "nested/links.txt": strToU8("wrong member") });
  assert.throws(() => extractLinksText(zip), /links artifact member missing/);
});
