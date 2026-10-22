import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {
  extractWordText,
  extractOdtText,
  extractRtfText,
  extractZipText,
} from "./documents-extract.server";

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

async function makeDocx(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?>
<w:document ${W_NS}><w:body>
<w:p><w:r><w:t>Привет, мир!</w:t></w:r><w:r><w:tab/><w:t>вторая колонка</w:t></w:r></w:p>
<w:p><w:r><w:t>Строка один</w:t></w:r><w:r><w:br/></w:r><w:r><w:t>Строка два</w:t></w:r></w:p>
<w:tbl>
<w:tr><w:tc><w:p><w:r><w:t>Имя</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Роль</w:t></w:r></w:p></w:tc></w:tr>
<w:tr><w:tc><w:p><w:r><w:t>Айзада</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Менеджер</w:t></w:r></w:p></w:tc></w:tr>
</w:tbl>
</w:body></w:document>`,
  );
  zip.file(
    "word/header1.xml",
    `<?xml version="1.0"?><w:hdr ${W_NS}><w:p><w:r><w:t>Шапка документа</w:t></w:r></w:p></w:hdr>`,
  );
  return zip.generateAsync({ type: "uint8array" });
}

test("extractWordText: paragraphs, tab, line break, table and header", async () => {
  const text = await extractWordText(await makeDocx());
  assert.match(text, /Привет, мир!\tвторая колонка/);
  assert.match(text, /Строка один\nСтрока два/);
  assert.match(text, /Имя \| Роль/);
  assert.match(text, /Айзада \| Менеджер/);
  assert.match(text, /Шапка документа/);
});

test("extractOdtText: headings, paragraphs, line breaks and table rows", async () => {
  const zip = new JSZip();
  zip.file(
    "content.xml",
    `<?xml version="1.0"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0">
<office:body><office:text>
<text:h text:outline-level="1">Заголовок отчёта</text:h>
<text:p>Первый абзац<text:line-break/>вторая строка</text:p>
<table:table><table:table-row>
<table:table-cell><text:p>Клетка 1</text:p></table:table-cell>
<table:table-cell><text:p>Клетка 2</text:p></table:table-cell>
</table:table-row></table:table>
</office:text></office:body></office:document-content>`,
  );
  const text = await extractOdtText(await zip.generateAsync({ type: "uint8array" }));
  assert.match(text, /Заголовок отчёта/);
  assert.match(text, /Первый абзац\nвторая строка/);
  assert.match(text, /Клетка 1 \| Клетка 2/);
});

test("extractRtfText: \\uN Cyrillic escapes, \\'xx cp1251 bytes, skipped fonttbl", () => {
  const rtf = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}{\\colortbl;\\red255\\green0\\blue0;}
\\uc1\\u1055?\\u1088?\\u1080?\\u1074?\\u1077?\\u1090?\\par
\\'cf\\'f0\\'e8\\'e2\\'e5\\'f2\\par
Tab\\tab here}`;
  const text = extractRtfText(new TextEncoder().encode(rtf));
  const lines = text.split("\n");
  assert.equal(lines[0], "Привет");
  assert.equal(lines[1], "Привет");
  assert.match(text, /Tab\there/);
  assert.ok(!text.includes("Arial"), "font table must be skipped");
});

test("extractZipText: WhatsApp _chat.txt, embedded docx, image listed by name, hidden skipped", async () => {
  const inner = new JSZip();
  inner.file("_chat.txt", "[10.10.2026, 12:00] Aizada: Салам, как дела?");
  inner.file("doc.docx", await makeDocx());
  inner.file("photo.jpg", new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
  inner.file(".hidden.txt", "secret");
  inner.file("__MACOSX/._chat.txt", "junk");
  inner.file("inner.zip", new Uint8Array([0x50, 0x4b, 0x05, 0x06]));

  const text = await extractZipText(await inner.generateAsync({ type: "uint8array" }));
  assert.match(text, /## FILE: _chat\.txt/);
  assert.match(text, /Салам, как дела\?/);
  assert.match(text, /## FILE: doc\.docx/);
  assert.match(text, /Привет, мир!/);
  assert.match(text, /## FILE: photo\.jpg\n\[PDF\/изображение — загрузите отдельно, чтобы ИИ прочитал\]/);
  assert.ok(!text.includes("secret"), "hidden files must be skipped");
  assert.ok(!text.includes("junk"), "__MACOSX must be skipped");
  assert.ok(!text.includes("inner.zip"), "nested zips must be skipped");
});
