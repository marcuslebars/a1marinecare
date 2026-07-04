import fs from "fs";
import path from "path";

const standalone = ".next/standalone";

const copies = [
  { src: "public", dst: `${standalone}/public` },
  { src: ".next/static", dst: `${standalone}/.next/static` },
];

for (const { src, dst } of copies) {
  if (fs.existsSync(src)) {
    fs.mkdirSync(dst, { recursive: true });
    fs.cpSync(src, dst, { recursive: true });
    console.log(`Copied ${src} -> ${dst}`);
  } else {
    console.warn(`Skipping ${src} - not found`);
  }
}
