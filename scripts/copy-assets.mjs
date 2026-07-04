import fs from "fs";
import path from "path";

const copies = [
  ["public", ".next/standalone/public"],
  [".next/static", ".next/standalone/.next/static"],
];

for (const [src, dst] of copies) {
  fs.mkdirSync(dst, { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
  console.log("Copied", src, "->", dst);
}
