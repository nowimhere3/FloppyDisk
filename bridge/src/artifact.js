import { unzipSync } from "fflate";

const decoder = new TextDecoder("utf-8", { fatal: true });

export function extractLinksText(zipBytes) {
  const files = unzipSync(new Uint8Array(zipBytes), {
    filter: entry => entry.name === "links.txt",
  });
  const names = Object.keys(files);
  if (names.length !== 1 || names[0] !== "links.txt") {
    throw new Error("links artifact member missing");
  }
  return decoder.decode(files["links.txt"]);
}
