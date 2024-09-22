document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.querySelector("#board");//used for manipulating DOM
  const tool = canvas.getContext("2d");//this provide 2d context property
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const socket = io();//initilazie the websocket connection

  let isDrawing = false;
  let currentTool = "pencil";
  let undoStack = [];
  let redoStack = [];

  // Pencil controls
  let colorPicker = document.querySelector("#colorPicker");
  let lineWidth = document.querySelector("#lineWidth");

  // Eraser controls
  let eraserSize = document.querySelector("#eraserSize");

  colorPicker.addEventListener("input", function () {
    if (currentTool === "pencil") {
      tool.strokeStyle = colorPicker.value;//prperty of 2d context that defines color ,gradient etc
    }
  });

  lineWidth.addEventListener("input", function () {
    if (currentTool === "pencil") {
      tool.lineWidth = lineWidth.value;
    }
  });

  eraserSize.addEventListener("input", function () {
    if (currentTool === "eraser") {
      tool.lineWidth = eraserSize.value;
      document.getElementById("eraserControls").classList.remove("active");
    }
  });

  document.getElementById("pencil").addEventListener("click", function () {
    currentTool = "pencil";
    tool.strokeStyle = colorPicker.value;
    tool.lineWidth = lineWidth.value;

    // Show pencil controls
    document.getElementById("pencilControls").classList.add("active");
    document.getElementById("eraserControls").classList.remove("active");

    // Hide pencil controls when properties are selected
    colorPicker.addEventListener("change", function () {
      document.getElementById("pencilControls").classList.remove("active");
    });

    lineWidth.addEventListener("input", function () {
      document.getElementById("pencilControls").classList.remove("active");
    });
  });

  document.getElementById("eraser").addEventListener("click", function () {
    currentTool = "eraser";
    tool.strokeStyle = "white";
    tool.lineWidth = eraserSize.value;

    // Show eraser controls
    document.getElementById("eraserControls").classList.add("active");
    document.getElementById("pencilControls").classList.remove("active");
  });

  document.querySelectorAll(".tool").forEach((element) => {
    element.addEventListener("click", function () {
      const toolname = this.id;
      switch (toolname) {
        case "pencil":
          currentTool = "pencil";
          tool.strokeStyle = colorPicker.value;
          tool.lineWidth = lineWidth.value;
          break;
        case "eraser":
          currentTool = "eraser";
          tool.strokeStyle = "white";
          tool.lineWidth = eraserSize.value;
          break;
        case "sticky":
          createSticky();
          break;
        case "upload":
          uploadFile();
          break;
        case "download":
          showDownloadOptions();
          break;
        case "undo":
          undoFN();
          break;
        case "redo":
          redoFN();
          break;
      }
    });
  });

  canvas.addEventListener("mousedown", function (e) {//mose button pressed
    isDrawing = true;//drawing started
    tool.beginPath();
    const toolbarHeight = getYDelta();//adjust y coordinate of mouse event 
    const x = e.clientX;
    const y = e.clientY - toolbarHeight;//Retrieves the x and y coordinates of the mouse event, adjusting the y-coordinate by subtracting the toolbar height.
    tool.moveTo(x, y);
    emitDrawingEvent("mousedown", x, y, tool.strokeStyle, tool.lineWidth);
    saveState(); // Save state when starting to draw use for undo functinality
  });

  canvas.addEventListener("mousemove", function (e) {
    if (!isDrawing) return;
    const toolbarHeight = getYDelta();
    const x = e.clientX;
    const y = e.clientY - toolbarHeight;
    tool.lineTo(x, y);
    tool.stroke();
    emitDrawingEvent("mousemove", x, y);
  });

  canvas.addEventListener("mouseup", function (e) {
    isDrawing = false;
  });

  function emitDrawingEvent(type, x, y, color, width) {
    socket.emit('drawing', { type, x, y, color, width });//drawing viva websocket
  }

  socket.on('drawing', (data) => {
    const { type, x, y, color, width } = data;
    if (type === "mousedown") {
      tool.beginPath();
      tool.moveTo(x, y);
      tool.strokeStyle = color;
      tool.lineWidth = width;
    } else if (type === "mousemove") {
      tool.lineTo(x, y);
      tool.stroke();
    }
  });

  function getYDelta() {
    const toolbarHeight = document.querySelector(".toolbar").getBoundingClientRect().height;
    return toolbarHeight;
  }

  function createSticky() {
    const stickyTemplate = document.createElement("div");
    stickyTemplate.classList.add("sticky");

    const navDiv = document.createElement("div");
    navDiv.classList.add("nav");

    const minimizeDiv = document.createElement("div");
    minimizeDiv.classList.add("minimize");
    minimizeDiv.textContent = "--";

    const closeDiv = document.createElement("div");
    closeDiv.classList.add("close");
    closeDiv.textContent = "X";

    const textarea = document.createElement("textarea");
    textarea.classList.add("text-area");

    navDiv.appendChild(minimizeDiv);
    navDiv.appendChild(closeDiv);
    stickyTemplate.appendChild(navDiv);
    stickyTemplate.appendChild(textarea);
    document.body.appendChild(stickyTemplate);

    let isMinimized = false;
    minimizeDiv.addEventListener("click", function () {
      isMinimized = !isMinimized;
      textarea.style.display = isMinimized ? "none" : "block";
    });

    closeDiv.addEventListener("click", function () {
      stickyTemplate.remove();
    });

    let isStickyDown = false;
    let initialX, initialY;

    navDiv.addEventListener("mousedown", function (e) {
      initialX = e.clientX;
      initialY = e.clientY;
      isStickyDown = true;
    });

    navDiv.addEventListener("mousemove", function (e) {
      if (isStickyDown) {
        const { top, left } = stickyTemplate.getBoundingClientRect();
        const finalX = e.clientX;
        const finalY = e.clientY;
        const dx = finalX - initialX;
        const dy = finalY - initialY;
        stickyTemplate.style.top = `${top + dy}px`;
        stickyTemplate.style.left = `${left + dx}px`;
        initialX = finalX;
        initialY = finalY;
      }
    });

    navDiv.addEventListener("mouseup", function () {
      isStickyDown = false;
    });
  }

  function uploadFile() {
    const inputTag = document.querySelector(".input-tag");
    inputTag.click();
    inputTag.addEventListener("change", function () {
      const file = inputTag.files[0];
      const img = document.createElement("img");
      const url = URL.createObjectURL(file);
      img.src = url;
      img.classList.add("upload-img");
      const stickyDiv = createOuterShell(img);
      stickyDiv.appendChild(img);
    });
  }

  function showDownloadOptions() {
    document.getElementById("downloadControls").style.display = "block";
  }

  document.getElementById("downloadConfirm").addEventListener("click", function () {
    const format = document.getElementById("fileFormat").value;
    downloadFile(format);
    document.getElementById("downloadControls").style.display = "none";
  });

  function downloadFile(format) {
    const a = document.createElement("a");
    a.download = `file.${format}`;
    const url = canvas.toDataURL(`image/${format}`);
    a.href = url;
    a.click();
    a.remove();
  }

  function saveState() {
    undoStack.push(canvas.toDataURL());
    redoStack = []; // Clear the redo stack whenever a new action is taken
  }

  function undoFN() {
    if (undoStack.length > 0) {
      redoStack.push(canvas.toDataURL());//data stored in url form
      const lastState = undoStack.pop();
      const img = new Image();
      img.src = lastState;
      img.onload = () => {
        tool.clearRect(0, 0, canvas.width, canvas.height);
        tool.drawImage(img, 0, 0);
      };
    }
  }

  function redoFN() {
    if (redoStack.length > 0) {
      undoStack.push(canvas.toDataURL());
      const nextState = redoStack.pop();
      const img = new Image();
      img.src = nextState;
      img.onload = () => {
        tool.clearRect(0, 0, canvas.width, canvas.height);
        tool.drawImage(img, 0, 0);
      };
    }
  }

  function createOuterShell(content) {
    let stickydiv = document.createElement("div");
    let navdiv = document.createElement("div");
    let mindiv = document.createElement("div");
    let closediv = document.createElement("div");

    mindiv.innerText = "--";
    closediv.innerText = "X";

    stickydiv.setAttribute("class", "sticky");
    navdiv.setAttribute("class", "nav");
    mindiv.setAttribute("class", "minimize");
    closediv.setAttribute("class", "close");

    stickydiv.appendChild(navdiv);
    navdiv.appendChild(mindiv);
    navdiv.appendChild(closediv);

    document.body.appendChild(stickydiv);

    let isMinimized = false;
    closediv.addEventListener("click", function () {
      stickydiv.remove();
    });
    mindiv.addEventListener("click", function () {
      content.style.display = isMinimized ? "block" : "none";
      isMinimized = !isMinimized;
    });

    let isStickyDown = false;
    let initialX, initialY;
    navdiv.addEventListener("mousedown", function (e) {
      initialX = e.clientX;
      initialY = e.clientY;
      isStickyDown = true;
    });
    navdiv.addEventListener("mousemove", function (e) {
      if (isStickyDown) {
        let finalX = e.clientX;
        let finalY = e.clientY;
        let dx = finalX - initialX;
        let dy = finalY - initialY;
        let { top, left } = stickydiv.getBoundingClientRect();
        stickydiv.style.top = top + dy + "px";
        stickydiv.style.left = left + dx + "px";
        initialX = finalX;
        initialY = finalY;
      }
    });
    navdiv.addEventListener("mouseup", function () {
      isStickyDown = false;
    });

    stickydiv.appendChild(content);
    return stickydiv;
  }
});
