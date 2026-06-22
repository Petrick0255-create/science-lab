const fs = require("fs");
const path = require("path");

const R2_BASE_URL = "https://pub-fa71059b7bda45a2998e6c05a6a6212d.r2.dev";

const LOCAL_IMAGE_DIR = path.join(__dirname, "images");
const LOCAL_PDF_DIR = path.join(__dirname, "pdf");

const OUT_DIR = path.join(__dirname, "data");
const OUT_FILE = path.join(OUT_DIR, "index.json");

function listFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`폴더 없음: ${dir}`);
    return [];
  }

  return fs.readdirSync(dir).filter(file => !file.startsWith("."));
}

function encodePath(folder, filename) {
  return `${R2_BASE_URL}/${folder}/${encodeURIComponent(filename)}`;
}

const imageFiles = listFiles(LOCAL_IMAGE_DIR)
  .filter(file => /\.(png|jpg|jpeg|webp)$/i.test(file));

const pdfFiles = listFiles(LOCAL_PDF_DIR)
  .filter(file => /\.pdf$/i.test(file));

const pdfList = pdfFiles.map(file => {
  const upper = file.toUpperCase();
  const keyMatch = upper.match(/[123][PCBG]\d{4}/);

  return {
    name: file,
    key: keyMatch ? keyMatch[0] : "",
    type: file.includes("해설") ? "solution" : "problem",
    url: encodePath("pdf", file)
  };
});

const index = imageFiles.map(file => {
  const code = path.parse(file).name.toUpperCase();
  const pdfKey = code.slice(0, 6);

  const problemPdf = pdfList.find(pdf => pdf.key === pdfKey && pdf.type === "problem");
  const solutionPdf = pdfList.find(pdf => pdf.key === pdfKey && pdf.type === "solution");

  return {
    code,
    pdfKey,
    imageName: file,
    image: encodePath("images", file),

    problemPdf: problemPdf ? problemPdf.url : "",
    problemPdfName: problemPdf ? problemPdf.name : "",

    solutionPdf: solutionPdf ? solutionPdf.url : "",
    solutionPdfName: solutionPdf ? solutionPdf.name : ""
  };
});

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR);
}

fs.writeFileSync(OUT_FILE, JSON.stringify(index, null, 2), "utf-8");

console.log("색인 생성 완료");
console.log(`이미지: ${imageFiles.length}개`);
console.log(`PDF: ${pdfFiles.length}개`);
console.log(`색인: ${index.length}개`);
console.log(`저장 위치: ${OUT_FILE}`);