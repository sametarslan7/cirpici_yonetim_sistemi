// Bir defalık yardımcı script: TTF fontlarını base64'e çevirip
// jsPDF'in sunucu tarafında kullanabileceği bir TS modülü üretir.
// Çalıştırmak için: node src/lib/fonts/generate-base64.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));

const regular = readFileSync(path.join(dir, "FiraSans-Regular.ttf")).toString("base64");
const bold = readFileSync(path.join(dir, "FiraSans-Bold.ttf")).toString("base64");

const out = `// Bu dosya otomatik üretildi (generate-base64.mjs). Elle düzenlemeyin.
// Türkçe karakterleri (ğ, ş, ı, İ, ö, ü, ç) doğru göstermek için jsPDF'e
// gömülen Fira Sans fontu (OFL lisanslı, Google Fonts).
export const FIRA_SANS_REGULAR_BASE64 = "${regular}";
export const FIRA_SANS_BOLD_BASE64 = "${bold}";
`;

writeFileSync(path.join(dir, "fira-sans-base64.ts"), out, "utf-8");
console.log("fira-sans-base64.ts üretildi.");
