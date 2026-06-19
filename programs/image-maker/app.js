const canvas = new fabric.Canvas("canvas", {
  preserveObjectStacking: true,
  backgroundColor: "white"
});

const imageListEl = document.getElementById("imageList");
const searchInput = document.getElementById("searchInput");

let IMAGE_LIST = [];

loadImages();

async function loadImages(){
  try{
    const res = await fetch("images.json");
    IMAGE_LIST = await res.json();
    renderImageList();
  }catch(e){
    imageListEl.innerHTML = "<p style='color:#f87171'>images.json을 읽지 못했습니다.</p>";
    console.error(e);
  }
}

searchInput.addEventListener("input", renderImageList);

function renderImageList(){
  const keyword = searchInput.value.trim().toLowerCase();

  imageListEl.innerHTML = "";

  IMAGE_LIST
    .slice()
    .sort((a,b) => a.name.localeCompare(b.name, "ko"))
    .filter(item =>
      item.name.toLowerCase().includes(keyword) ||
      item.file.toLowerCase().includes(keyword)
    )
    .forEach(item => {
      const div = document.createElement("div");
      div.className = "image-item";
      div.draggable = true;
      div.dataset.src = item.file;

      div.innerHTML = `
        <img src="${item.file}" alt="${item.name}">
        <span>${item.name}</span>
      `;

      div.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text/plain", item.file);
      });

      div.addEventListener("click", () => {
        addImageToCanvas(item.file, 450, 310);
      });

      imageListEl.appendChild(div);
    });
}

const canvasBox = document.querySelector(".canvas-wrap");

canvasBox.addEventListener("dragover", e => {
  e.preventDefault();
});

canvasBox.addEventListener("drop", e => {
  e.preventDefault();

  const src = e.dataTransfer.getData("text/plain");
  if(!src) return;

  const pointer = canvas.getPointer(e);
  addImageToCanvas(src, pointer.x, pointer.y);
});

function addImageToCanvas(src, x, y){
  fabric.Image.fromURL(
    src,
    img => {
      const maxW = 260;
      const maxH = 220;

      const scale = Math.min(
        maxW / img.width,
        maxH / img.height,
        1
      );

      img.set({
        left: x,
        top: y,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    },
    { crossOrigin: "anonymous" }
  );
}

document.getElementById("addRectBtn").addEventListener("click", () => {
  const rect = new fabric.Rect({
    left: 180,
    top: 140,
    width: 160,
    height: 100,
    fill: "transparent",
    stroke: "#ef4444",
    strokeWidth: 4
  });

  canvas.add(rect);
  canvas.setActiveObject(rect);
});

document.getElementById("addCircleBtn").addEventListener("click", () => {
  const circle = new fabric.Circle({
    left: 220,
    top: 160,
    radius: 55,
    fill: "transparent",
    stroke: "#2563eb",
    strokeWidth: 4
  });

  canvas.add(circle);
  canvas.setActiveObject(circle);
});

document.getElementById("addLineBtn").addEventListener("click", () => {
  const line = new fabric.Line([100, 100, 300, 100], {
    stroke: "#111827",
    strokeWidth: 4
  });

  canvas.add(line);
  canvas.setActiveObject(line);
});

document.getElementById("addTextBtn").addEventListener("click", () => {
  const text = new fabric.Textbox("텍스트", {
    left: 200,
    top: 200,
    fontSize: 32,
    fill: "#111827",
    fontWeight: "bold"
  });

  canvas.add(text);
  canvas.setActiveObject(text);
});

document.getElementById("grayBtn").addEventListener("click", () => {
  const obj = canvas.getActiveObject();
  if(!obj || obj.type !== "image") return;

  obj.filters = [new fabric.Image.filters.Grayscale()];
  obj.applyFilters();
  canvas.renderAll();
});

document.getElementById("colorBtn").addEventListener("click", () => {
  const obj = canvas.getActiveObject();
  if(!obj || obj.type !== "image") return;

  obj.filters = [];
  obj.applyFilters();
  canvas.renderAll();
});

document.getElementById("frontBtn").addEventListener("click", () => {
  const obj = canvas.getActiveObject();
  if(!obj) return;

  canvas.bringForward(obj);
  canvas.renderAll();
});

document.getElementById("backBtn").addEventListener("click", () => {
  const obj = canvas.getActiveObject();
  if(!obj) return;

  canvas.sendBackwards(obj);
  canvas.renderAll();
});

document.getElementById("deleteBtn").addEventListener("click", () => {
  const obj = canvas.getActiveObject();
  if(!obj) return;

  canvas.remove(obj);
});

document.querySelectorAll(".color").forEach(btn => {
  btn.addEventListener("click", () => {
    const obj = canvas.getActiveObject();
    if(!obj) return;

    const color = btn.dataset.color;

    if(obj.type === "rect" || obj.type === "circle"){
      obj.set("stroke", color);
    }else if(obj.type === "line"){
      obj.set("stroke", color);
    }else if(obj.type === "textbox"){
      obj.set("fill", color);
    }

    canvas.renderAll();
  });
});

document.getElementById("clearBtn").addEventListener("click", () => {
  if(confirm("전체를 지울까요?")){
    canvas.clear();
    canvas.backgroundColor = "white";
    canvas.renderAll();
  }
});

document.getElementById("saveBtn").addEventListener("click", () => {
  const dataURL = canvas.toDataURL({
    format: "png",
    quality: 1,
    multiplier: 2
  });

  const a = document.createElement("a");
  a.href = dataURL;
  a.download = "JNB_image.png";
  a.click();
});

document.addEventListener("keydown", e => {
  if(e.key === "Delete"){
    const obj = canvas.getActiveObject();
    if(obj) canvas.remove(obj);
  }
});