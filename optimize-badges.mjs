import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve("public/lovable-uploads"); 
const MAX_SIZE = 256; 

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const exts = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const files = walk(ROOT).filter(f => exts.has(path.extname(f).toLowerCase()));
console.log(`Found ${files.length} images in ${ROOT}`);

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  try {
    const img = sharp(file);
    const meta = await img.metadata();
    const needResize = (meta.width && meta.width > MAX_SIZE) || (meta.height && meta.height > MAX_SIZE);

    let pipeline = img;
    if (needResize) {
      pipeline = pipeline.resize({
        width: MAX_SIZE,
        height: MAX_SIZE,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    if (ext === ".png") {
      await pipeline.png({ compressionLevel: 9, palette: true }).toFile(file + ".tmp");
    } else if (ext === ".jpg" || ext === ".jpeg") {
      await pipeline.jpeg({ quality: 75, mozjpeg: true }).toFile(file + ".tmp");
    } else if (ext === ".webp") {
      await pipeline.webp({ quality: 75 }).toFile(file + ".tmp");
    }

    fs.renameSync(file + ".tmp", file);
  } catch (e) {
    console.warn("Failed:", file, e.message);
  }
}

console.log("Done.");
