const fs = require("fs");
const path = require("path");

const IMG_DIR = path.join(__dirname, "images");
const PDF_DIR = path.join(__dirname, "pdf");
const OUT_DIR = path.join(__dirname, "data");
const OUT_FILE = path.join(OUT_DIR, "index.json");

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => !f.startsWith("."));
}

const images = listFiles(IMG_DIR)
  .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
  .map(f => ({
    name: f,
    code: path.parse(f).name.toUpperCase(),
    path: `images/${f}`
  }));

const pdfs = listFiles(PDF_DIR)
  .filter(f => /\.pdf$/i.test(f))
  .map(f => {
    const name = f;
    const upper = name.toUpperCase();
    const codeMatch = upper.match(/[123][PCBG]\d{4}/);

    return {
      name,
      key: codeMatch ? codeMatch[0] : "",
      type: name.includes("해설") ? "solution" : "problem",
      path: `pdf/${f}`
    };
  });

const index = images.map(img => {
  const pdfKey = img.code.slice(0, 6);

  const problemPdf = pdfs.find(p => p.key === pdfKey && p.type === "problem");
  const solutionPdf = pdfs.find(p => p.key === pdfKey && p.type === "solution");

  return {
    code: img.code,
    pdfKey,
    image: img.path,
    problemPdf: problemPdf ? problemPdf.path : "",
    problemPdfName: problemPdf ? problemPdf.name : "",
    solutionPdf: solutionPdf ? solutionPdf.path : "",
    solutionPdfName: solutionPdf ? solutionPdf.name : ""
  };
});

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

fs.writeFileSync(OUT_FILE, JSON.stringify(index, null, 2), "utf-8");

console.log(`색인 생성 완료: ${index.length}개`);