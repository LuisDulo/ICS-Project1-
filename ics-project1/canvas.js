const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let tool = "brush";
let drawing = false;
let history = [];
let redoStack = [];

let elements = []; // shapes, text, images
let currentElement = null;

// Tool control
function setTool(selectedTool) {
  tool = selectedTool;
}

// Drawing logic
canvas.addEventListener("mousedown", (e) => {
  const { offsetX, offsetY } = e;
  if (tool === "brush" || tool === "eraser") {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
  }
});

canvas.addEventListener("mousemove", (e) => {
  const { offsetX, offsetY } = e;
  if (drawing) {
    ctx.lineTo(offsetX, offsetY);
    ctx.strokeStyle = tool === "eraser" ? "#fff" : "#000";
    ctx.lineWidth = tool === "eraser" ? 20 : 2;
    ctx.stroke();
  }
});

canvas.addEventListener("mouseup", () => {
  drawing = false;
  ctx.closePath();
  saveState();
});

function addShape(type) {
  const shape = {
    id: Date.now(),
    type,
    x: 100,
    y: 100,
    width: 100,
    height: 100,
    draggable: true,
  };
  elements.push(shape);
  drawElements();
  saveState();
}

function addText() {
  const text = {
    type: "text",
    content: "Edit me",
    x: 150,
    y: 150,
    font: "20px Arial",
    draggable: true,
  };
  elements.push(text);
  drawElements();
  saveState();
}

function drawElements() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const el of elements) {
    if (el.type === "rect") {
      ctx.fillStyle = "#6366f1";
      ctx.fillRect(el.x, el.y, el.width, el.height);
    } else if (el.type === "circle") {
      ctx.beginPath();
      ctx.arc(el.x, el.y, 50, 0, Math.PI * 2);
      ctx.fillStyle = "#6366f1";
      ctx.fill();
    } else if (el.type === "text") {
      ctx.font = el.font;
      ctx.fillStyle = "#000";
      ctx.fillText(el.content, el.x, el.y);
    } else if (el.type === "image") {
      ctx.drawImage(el.img, el.x, el.y, el.width, el.height);
    }
  }
}

canvas.addEventListener("mousedown", (e) => {
  const { offsetX, offsetY } = e;
  for (const el of elements.reverse()) {
    if (
      offsetX >= el.x &&
      offsetX <= el.x + (el.width || 100) &&
      offsetY >= el.y &&
      offsetY <= el.y + (el.height || 100)
    ) {
      currentElement = el;
      break;
    }
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (!currentElement) return;
  const { offsetX, offsetY } = e;
  currentElement.x = offsetX;
  currentElement.y = offsetY;
  drawElements();
});

canvas.addEventListener("mouseup", () => {
  currentElement = null;
});

function saveState() {
  history.push(JSON.stringify(elements));
  redoStack = [];
}

function undo() {
  if (history.length > 1) {
    redoStack.push(history.pop());
    elements = JSON.parse(history[history.length - 1]);
    drawElements();
  }
}

function redo() {
  if (redoStack.length > 0) {
    const redoState = redoStack.pop();
    history.push(redoState);
    elements = JSON.parse(redoState);
    drawElements();
  }
}

document.getElementById("upload").addEventListener("change", function (e) {
  const file = e.target.files[0];
  const img = new Image();
  img.onload = () => {
    elements.push({
      type: "image",
      img,
      x: 100,
      y: 100,
      width: 200,
      height: 200
    });
    drawElements();
    saveState();
  };
  img.src = URL.createObjectURL(file);
});

function exportImage() {
  const image = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = "design.png";
  link.href = image;
  link.click();
}
