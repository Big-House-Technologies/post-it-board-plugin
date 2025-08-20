function(instance, properties, context) {
  // global function - TODO
  if (instance.data.has_initialized === true) {
    console.log("✅ Already initialized. Skipping...");

    const event = new CustomEvent('PostIt-updateStyle', {
      detail: {
        backgroundColor: properties.post_it_background_color
      }
    });

    return;
  }

  console.log("✅ Initializing Post-It Board");

  const canvasID = properties.canvasID;
  const board = document.getElementById(canvasID);
  const boardConfig = {
    editable: true,
  }

  if (!canvasID || !board) {
    console.warn("⚠️ No canvas ID or board element found.");
    return;
  }

  board.style.position = "relative";

  // Clear the board of existing post-its to prevent duplicates
  while (board.firstChild) {
    board.removeChild(board.firstChild);
  }
  console.log("🧹 Cleared board of existing post-its");

  // Global state 
  const postItElements = {};
  const postItsData = new Map();
  let selectedPostIt = null;
  let selectedPostItData = null;
  let isUpdating = false;

  const publishStates = (id, text, customStyle) => {
    instance.publishState("customStyle", JSON.stringify(customStyle ?? {}));
    instance.publishState("postItText", text);
    instance.publishState("postItId", id);
  }

  const checkAndUpdateStyle = (newStyle) => {

    if (selectedPostIt) {
      Object.entries(newStyle).forEach(([key, value]) => {
        selectedPostIt.style[key] = value;
      });


      if (selectedPostItData) {
        selectedPostItData.customStyle = {
          ...selectedPostItData.customStyle,
          ...newStyle
        };
        const { text, customStyle, id } = selectedPostItData;
        publishStates(id, text, customStyle)
        updateOverlay(selectedPostIt);

        instance.triggerEvent("postItUpdated");
      }
    }

  }

  document.addEventListener('PostIt-updateStyle', function (event) {
    checkAndUpdateStyle(event.detail)
  })


  // Helper functions
  const debounce = (func, wait) => {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const sanitizeText = (text) => {
    if (!text) return "";
    return text.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, "").trim();
  };

  const loadAllBubbleList = (list) => {
    if (!list || typeof list.get !== "function" || typeof list.length !== "function") return [];
    return list.get(0, list.length());
  };

  const safeJsonParse = (content) => {
    try {
      if (typeof content === 'object') {
        return content;
      }
      return JSON.parse(content);
    } catch (err) {
      console.debug('Error while parsing content', err, content);
      return undefined;
    }
  }

  // Load post-it data from Bubble
  const loadPostItData = () => {
    // Load from JSON strings
    if (properties.existingPostItObjects && typeof properties.existingPostItObjects.get === "function") {
      try {
        const rawPostIts = loadAllBubbleList(properties.existingPostItObjects);
        console.log("🔹 Post-Data (JSON):", rawPostIts.length);

        rawPostIts.forEach(str => {
          try {
            const data = JSON.parse(str);
            if (data && data.postItId) {
              postItsData.set(data.postItId, {
                id: data.postItId,
                text: sanitizeText(data.text),
                customStyle: safeJsonParse(data.customStyle)
              });
            }
          } catch (err) {
            console.warn("⚠️ Invalid JSON:", str);
          }
        });
      } catch (err) {
        if (err.message === 'not ready') throw err;
        console.warn("⚠️ Error loading existingPostItObjects:", err);
      }
    }

    console.log(`📊 Total unique post-its loaded: ${postItsData.size}`);
  };

  // Styling
  const fontSize = typeof properties.bubble.font_size === 'function'
    ? properties.bubble.font_size() + 'px'
    : (properties.bubble.font_size || '14px');

  const defaultCustomStyle = {
    width: "100px",
    height: "100px",
    'background-color': '#008000',
    'border-width': '1px',
    'border-color': '#000000',
    'font-size': fontSize,
    'font-family': 'Arial',
  }
  const postItStyle = {
    position: "absolute",
    padding: "10px",
    userSelect: "none",
    overflow: "auto",
    zIndex: 500,
    borderStyle: 'solid',
    textWrap: "auto",
  };

  const getSelectionStyle = () => ({
    outline: `${properties.selected_width_border || 2}px solid ${properties.selected_border_color || "red"}`,
    boxShadow: properties.selected_shadow ? `0 0 10px ${properties.selected_border_color || "red"}` : "none"
  });

  // Post-it management functions
  const clearSelection = () => {
    if (selectedPostIt) {
      selectedPostIt.style.outline = "none";
      selectedPostIt.style.boxShadow = "none";
      selectedPostIt.style.zIndex = 500;
      selectedPostIt.contentEditable = false;
      selectedPostIt = null;
    }
    editTextMode = false;

  };

  const focusPostItContent = (postIt) => {
    if (!postIt) return;
    postIt.focus();
    console.log("Clicked & focused:", document.activeElement);

    try {
      const range = document.createRange();
      const selection = window.getSelection();

      if (postIt.childNodes.length > 0) {
        const lastChild = postIt.childNodes[postIt.childNodes.length - 1];
        const offset = lastChild.textContent ? lastChild.textContent.length : 0;
        range.setStart(lastChild, offset);
        range.setEnd(lastChild, offset);
      } else {
        range.setStart(postIt, 0);
        range.setEnd(postIt, 0);
      }

      selection.removeAllRanges();
      selection.addRange(range);
    } catch (err) {
      console.warn("⚠️ Error focusing post-it content:", err);
    }
  };

  const updatePostItData = (postItId, newProps) => {
    if (!postItId) return;

    const postItData = postItsData.get(postItId) || { id: postItId };
    Object.assign(postItData, newProps);

    if (newProps.text !== undefined) {
      postItData.text = sanitizeText(newProps.text);
    }

    postItsData.set(postItId, postItData);
    return postItData;
  };

  const triggerPostItUpdate = (postItId, isCreated = false) => {
    if (!postItId || !postItsData.has(postItId)) return;

    const data = postItsData.get(postItId);
    isUpdating = true;

    publishStates(postItId, data.text, data.customStyle)
    instance.triggerEvent(isCreated ? "postItCreated" : "postItUpdated");

    setTimeout(() => {
      isUpdating = false;
      // if (selectedPostIt && document.activeElement !== selectedPostIt) {
      //   focusPostItContent(selectedPostIt);
      // }
    }, 10);
  };

  const debouncedTextUpdate = debounce((postIt, postItId, text) => {
    if (!postIt || !postItId) return;
    updatePostItData(postItId, { text });
    triggerPostItUpdate(postItId);
  }, 700);


  let resizing = false;
  let dragging = false;
  let currentHandle = null;
  let startX, startY, startW, startH, startT, startL;

  const startDragging = (e) => {
    if (!selectedPostIt || !boardConfig.editable) return;

    startX = e.clientX;
    startY = e.clientY;
    startT = selectedPostIt.offsetTop;
    startL = selectedPostIt.offsetLeft;

    dragging = !e.target.dataset.handle; // Not resizing

    // e.stopPropagation();
    // e.preventDefault();
  }

  // Event handlers for post-its
  const setupPostItEvents = (postIt, id) => {
    // Unified selection/focus handler
    const selectPostIt = (e) => {

      if (!boardConfig.editable) {
        console.warn("⚠️ Board is not editable. Skipping post-it creation.");
        return;
      }
      isUpdating = true;
      const alreadySelected = selectedPostIt === postIt;

      if (!alreadySelected && selectedPostIt) {
        clearSelection();
      }

      selectedPostIt = postIt;
      selectedPostItData = postItsData.get(id);
      selectedPostIt.style.zIndex = 1000; // Bring to front  

      focusPostItContent(postIt);
      updateOverlay(selectedPostIt);
      startX = postIt.offsetLeft;
      startY = postIt.offsetTop;
      publishStates(id, postIt.innerText, selectedPostItData.customStyle);
      if (selectedPostItData) {
        document.dispatchEvent(new CustomEvent('PostIt-selected-publishStyle', {
          detail: selectedPostItData.customStyle
        }));
      }

      e?.stopPropagation();
    };

    // Click handler
    postIt.addEventListener("click", selectPostIt);

    // Focus handler
    postIt.addEventListener("focus", () => {
      if (selectedPostIt !== postIt) {
        selectPostIt();
      }
    });

    // Input handler
    let lastContentValue = postIt.innerText;
    postIt.addEventListener("input", () => {
      const currentText = sanitizeText(postIt.innerText);
      if (currentText !== lastContentValue) {
        lastContentValue = currentText;
        debouncedTextUpdate(postIt, id, currentText);
      }
    });

    // Tab key handler
    postIt.addEventListener("keydown", (e) => {
      if (e?.key === "Tab") {
        e.preventDefault();
        document.execCommand("insertHTML", false, "&nbsp;&nbsp;&nbsp;&nbsp;");
      }
    });

    postIt.addEventListener("mousedown", (e) => {
      if (!boardConfig.editable) {
        console.warn("⚠️ Board is not editable. Skipping post-it creation.");
        return;
      }
      // Check if clicking on the post-it element itself and not on text selection
      // Remove previous check that was preventing dragging when focused
      dragStartTime = Date.now();
      postIt.style.cursor = "grabbing";
      postIt.setAttribute("data-original-z-index", postIt.style.zIndex || "auto");
      postIt.style.zIndex = 1000;
      // Temporarily disable content editing during drag
      if (document.activeElement === postIt) {
        // Save selection for later
        const savedSelection = window.getSelection();
        postIt.setAttribute('data-had-focus', 'true');
        postIt.blur();
      }

      if (selectedPostIt !== postIt) {
        clearSelection();
      } else {
        editTextMode = true;
        selectedPostIt.contentEditable = true;
      }
      selectedPostIt = postIt;
      selectedPostItData = postItsData.get(id);

      startDragging(e);
      updateOverlay(postIt);
    });

    document.addEventListener("mousemove", (e) => {
      if (!selectedPostIt) return;

      let dx = e.clientX - startX;
      let dy = e.clientY - startY;

      if (resizing) {
        let newW = startW, newH = startH, newT = startT, newL = startL;

        if (currentHandle.includes("right")) newW = startW + dx;
        if (currentHandle.includes("left")) {
          newW = startW - dx;
          newL = startL + dx;
        }
        if (currentHandle.includes("bottom")) newH = startH + dy;
        if (currentHandle.includes("top")) {
          newH = startH - dy;
          newT = startT + dy;
        }

        newW = Math.max(30, newW);
        newH = Math.max(30, newH);
        console.log("Resizing to:", newW, newH, "at", newL, newT);
        const newPostion = decidePostItPosition(newL, newT, newW, newH);
        console.log("Resizing to:", newW, newH, "at", newL, newT);
        console.log("After selection:", newPostion.width, newPostion.height, "at", newPostion.x, newPostion.y,);
        if (newPostion.x !== newL || newPostion.y !== newT
          || newPostion.width !== newW || newPostion.height !== newH) {
          return;
        }

        const { x, y, width, height } = newPostion;

        selectedPostIt.style.width = width + "px";
        selectedPostIt.style.height = height + "px";
        selectedPostIt.style.top = y + "px";
        selectedPostIt.style.left = x + "px";
        updateOverlay(selectedPostIt);

        if (selectedPostItData?.customStyle) {
          selectedPostItData.customStyle = {
            ...selectedPostItData.customStyle,
            width: selectedPostIt.style.width,
            height: selectedPostIt.style.height,
            top: selectedPostIt.style.top,
            left: selectedPostIt.style.left,
          }
        } else if (selectedPostItData) {
          selectedPostItData.customStyle = {
            width: selectedPostIt.style.width,
            height: selectedPostIt.style.height,
            top: selectedPostIt.style.top,
            left: selectedPostIt.style.left,
          }
        }
      } else if (dragging) {
        const newLeft = startL + dx;
        const newTop = startT + dy;
        if (selectedPostItData) {
          const newPosition = decidePostItPosition(newLeft, newTop,
            selectedPostItData.customStyle.width, selectedPostItData.customStyle.height);
          console.log("DRAGGING", newLeft, newTop, newPosition.x, newPosition.y)

          selectedPostIt.style.left = newPosition.x + "px";
          selectedPostIt.style.top = newPosition.y + "px";
          selectedPostItData.customStyle.top = selectedPostIt.style.top;
          selectedPostItData.customStyle.left = selectedPostIt.style.left;
          updateOverlay(selectedPostIt);
        }

      }
    });

    // === Mouse up ===
    document.addEventListener("mouseup", () => {
      if (resizing || dragging) {
        resizing = false;
        dragging = false;

        if (selectedPostItData) {
          triggerPostItUpdate(selectedPostItData.id);
          document.dispatchEvent(new CustomEvent('PostIt-selected-publishStyle', {
            detail: selectedPostItData.customStyle
          }));
        }

      }
    });
  };

  let boardRectangle;

  const decidePostItPosition = (left, top, width = 0, height = 0) => {
    if (!boardRectangle) {
      boardRectangle = board.getBoundingClientRect();
    }

    const newX = Math.max(0, Math.min(left, boardRectangle.width - parseFloat(width)));
    const newY = Math.max(0, Math.min(top, boardRectangle.height - parseFloat(height)));
    const newWidth = Math.max(30, Math.min(parseFloat(width), boardRectangle.width - newX));
    const newHeight = Math.max(30, Math.min(parseFloat(height), boardRectangle.height - newY));

    return {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    };
  }


  // Create and render a post-it note
  const createPostIt = (postItData) => {
    if (!postItData || !postItData.id) return null;
    const id = postItData.id;

    if (postItElements[id]) {
      const existingPostIt = postItElements[id];
      existingPostIt.style.left = postItData.x + "px";
      existingPostIt.style.top = postItData.y + "px";
      existingPostIt.innerText = postItData.text;
      return existingPostIt;
    }

    const postIt = document.createElement("div");
    Object.assign(postIt.style, postItStyle);
    postIt.innerText = postItData.text;

    if (postItData.customStyle) {
      Object.entries(postItData.customStyle).forEach(([key, value]) => {
        postIt.style[key] = value;
      })
    }

    if (!postIt.style.backgroundColor) {
      postIt.style.backgroundColor = 'green';
    }

    postIt.setAttribute("data-postit-id", id);

    postItElements[id] = postIt;
    board.appendChild(postIt);

    setupPostItEvents(postIt, id);

    return postIt;
  };

  // === Resize Box Overlay ===
  const resizeBox = document.createElement("div");
  resizeBox.style.position = "absolute";
  resizeBox.style.border = "2px solid #007bff";
  resizeBox.style.display = "none";
  resizeBox.style.pointerEvents = "none";
  resizeBox.style.zIndex = 1002;
  resizeBox.style.boxSizing = "border-box";
  board.appendChild(resizeBox);

  // Editable Content
  let editTextMode = false;


  const deleteBtn = document.createElement("div");
  deleteBtn.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
       fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
       viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14H6L5 6"></path>
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
    <path d="M9 6V4h6v2"></path>
  </svg>
`;
  deleteBtn.style.position = "absolute";
  deleteBtn.style.top = "-14px";
  deleteBtn.style.width = "25px";
  deleteBtn.style.height = "22px";
  deleteBtn.style.background = "#fff"; // white background
  deleteBtn.style.borderRadius = "6px"; // slightly rounded
  deleteBtn.style.display = "flex";
  deleteBtn.style.alignItems = "center";
  deleteBtn.style.textAlign = "center";
  deleteBtn.style.justifyContent = "center";
  deleteBtn.style.cursor = "pointer";
  deleteBtn.style.display = "none"; // only show on select
  deleteBtn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.25)";
  deleteBtn.style.zIndex = "1002";
  deleteBtn.title = "Delete";
  deleteBtn.style.userSelect = "none";

  board.appendChild(deleteBtn);
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (selectedPostIt && confirm("Are you sure you want to delete this item?")) {
      board.removeChild(selectedPostIt);
      resizeBox.style.display = "none";
      deleteBtn.style.display = "none";
      instance.publishState("postItId", selectedPostIt.getAttribute("data-postit-id"));
      instance.triggerEvent("postItDeleted");
    }
  });


  const handlePositions = ["top", "right", "bottom", "left", "topleft", "topright", "bottomleft", "bottomright"];
  const handles = {};

  handlePositions.forEach(pos => {
    const h = document.createElement("div");
    h.style.position = "absolute";
    h.style.width = "10px";
    h.style.height = "10px";
    h.style.background = "#007bff";
    h.style.pointerEvents = "all";
    h.dataset.handle = pos;
    h.style.cursor = {
      top: "ns-resize",
      bottom: "ns-resize",
      left: "ew-resize",
      right: "ew-resize",
      topleft: "nwse-resize",
      topright: "nesw-resize",
      bottomleft: "nesw-resize",
      bottomright: "nwse-resize"
    }[pos] || "pointer";

    resizeBox.appendChild(h);
    handles[pos] = h;
  });

  function positionHandles() {
    handles.top.style.top = "-5px";
    handles.top.style.left = "calc(50% - 5px)";

    handles.bottom.style.bottom = "-5px";
    handles.bottom.style.left = "calc(50% - 5px)";

    handles.left.style.left = "-5px";
    handles.left.style.top = "calc(50% - 5px)";

    handles.right.style.right = "-5px";
    handles.right.style.top = "calc(50% - 5px)";

    handles.topleft.style.top = "-5px";
    handles.topleft.style.left = "-5px";

    handles.topright.style.top = "-5px";
    handles.topright.style.right = "-5px";

    handles.bottomleft.style.bottom = "-5px";
    handles.bottomleft.style.left = "-5px";

    handles.bottomright.style.bottom = "-5px";
    handles.bottomright.style.right = "-5px";
  }

  function updateOverlay(el) {
    resizeBox.style.display = "block";
    resizeBox.style.top = el.offsetTop + "px";
    resizeBox.style.left = el.offsetLeft + "px";
    resizeBox.style.width = el.offsetWidth + "px";
    resizeBox.style.height = el.offsetHeight + "px";

    deleteBtn.style.top = (el.offsetTop - 25) + "px";
    deleteBtn.style.left = (el.offsetLeft + el.offsetWidth - 30) + "px";
    deleteBtn.style.display = "block";
    selectedPostIt.contentEditable = editTextMode;

    positionHandles();
  }

  // === Resize start ===
  Object.values(handles).forEach(h => {
    h.addEventListener("mousedown", (e) => {
      e.preventDefault();
      if (!selectedPostIt) return;

      resizing = true;
      currentHandle = h.dataset.handle;
      startX = e.clientX;
      startY = e.clientY;
      startW = selectedPostIt.offsetWidth;
      startH = selectedPostIt.offsetHeight;
      startT = selectedPostIt.offsetTop;
      startL = selectedPostIt.offsetLeft;
    });
  });

  // Set up board-level events
  const setupBoardEvents = () => {
    if (instance.data.eventAttached) return;

    // Create new post-it on board click
    board.addEventListener("click", (event) => {
      if (event.target !== board) return;

      if (isUpdating) return;

      if (!boardConfig.editable) {
        console.warn("⚠️ Board is not editable. Skipping post-it creation.");
        return;
      }

      clearSelection();

      const rect = board.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const newId = "pi_" + Math.random().toString(36).substr(2, 12);

      const newPosition = decidePostItPosition(x, y, defaultCustomStyle.width.replace("px", ""), defaultCustomStyle.height.replace("px", ""));

      const newPostItData = {
        id: newId,
        text: "[edit me]",
        customStyle: {
          left: newPosition?.x ? newPosition.x + "px" : "0px",
          top: newPosition?.y ? newPosition.y + "px" : "0px",
          ...defaultCustomStyle
        }
      };
      postItsData.set(newId, newPostItData);

      const postIt = createPostIt(newPostItData);
      if (postIt) {
        selectedPostIt = postIt;
        selectedPostItData = newPostItData;
        updateOverlay(selectedPostIt)
        Object.assign(postIt.style, getSelectionStyle());
        setTimeout(() => focusPostItContent(postIt), 50);
        triggerPostItUpdate(newId, true);
        document.dispatchEvent(new CustomEvent('PostIt-selected-publishStyle', {
          detail: selectedPostItData.customStyle
        }));
      }
    });

    // Delete selected post-it with DEL key
    document.addEventListener("keydown", (e) => {
      if (!boardConfig.editable) {
        console.warn("⚠️ Board is not editable. Skipping post-it deletion.");
        return;
      }

      if (!editTextMode && e.key === "Backspace"
        && selectedPostIt && e.target === document.body) {
        const id = selectedPostIt.getAttribute("data-postit-id");
        resizeBox.style.display = "none";
        deleteBtn.style.display = "none";

        board.removeChild(selectedPostIt);
        delete postItElements[id];
        postItsData.delete(id);

        selectedPostIt = null;

        instance.publishState("postItId", id);
        instance.triggerEvent("postItDeleted");
      }
    });

    document.addEventListener("focusin", () => {
      console.log("New activeElement:", document.activeElement);
    });

    document.addEventListener("focusout", () => {
      console.log("Focus left:", document.activeElement);
    });

    instance.data.eventAttached = true;
  };




  document.addEventListener("PostIt-config", (event) => {
    if (event.detail && typeof event.detail === 'object') {
      boardConfig.editable = event.detail.editable !== undefined ? event.detail.editable : true;
      if (!boardConfig.editable) {
        // Reset resize box
        resizeBox.style.display = "none";
        deleteBtn.style.display = "none";
        if (selectedPostIt) {
          selectedPostIt.style.zIndex = 500;
          selectedPostIt = null;
        }
      }
    }
  })


  // Main execution
  loadPostItData();
  postItsData.forEach((data) => createPostIt(data));
  setupBoardEvents();
  instance.data.has_initialized = true;
  console.log(`📊 Created ${Object.keys(postItElements).length} post-its on the board`);
}
