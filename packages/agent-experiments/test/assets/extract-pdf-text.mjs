import { extractText } from "unpdf";
import { readFileSync } from "fs";

const filePath = process.argv[2];
const buffer = readFileSync(filePath);
const result = await extractText(new Uint8Array(buffer));
process.stdout.write(result.text.join("\n"));
