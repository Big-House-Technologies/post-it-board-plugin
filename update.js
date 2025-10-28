function(instance, properties, context) {
  const Logger = (() => {
    let enabled = true;

    return {
      enable() { enabled = true; },
      disable() { enabled = false; },
      log(...args) {
        if (enabled) console.log(...args);
      }
    };
  })();
  Logger.disable();
  Logger.log('CHANGE', properties)

  const boardConfig = {
    backgroundColor: properties.backgroundColor,
    selectedShadow: properties.selectedShadow,
    selectedBoxShadowColor: properties.selectedBoxShadowColor,
    defaultText: properties.defaultText ?? '[Edit Me]',
    allowCreation: properties.allowCreation ?? true,
    allowEdit: properties.allowEdit ?? true,
    hasBorder: properties.hasBorder,
    defaultBorderColor: properties.defaultBorderColor
  }

  if (instance.data.has_initialized === true) {
    document.dispatchEvent(new CustomEvent('PostIt-dynamic-config-update', {
      detail: properties
    }));

    return;
  }

  const lastExternalEditableConfig = {
    allowCreation: boardConfig.allowCreation,
    allowEdit: boardConfig.allowEdit,
  }

  document.addEventListener("PostIt-update-PostIt-objects", (e) => {
    if (e.detail && typeof e.detail === 'object') {
      Object.assign(boardConfig, e.detail);
      Logger.log("🔄 Dynamic config updated:", boardConfig)
    };
  });

  const sendEventConfigUpdate = (editableConfig) => {
    document.dispatchEvent(new CustomEvent('PostIt-edtiable-config-update', {
      detail: {
        allowCreation: editableConfig.allowCreation,
        allowEdit: editableConfig.allowEdit,
      }
    }))
  }

  const hasSelectedPostItAndAllowEdit = () => selectedPostIt && boardConfig.allowEdit

  document.addEventListener("PostIt-dynamic-config-update", (e) => {
    // This one is from external config to internal config
    const properties = e?.detail;
    if (typeof e.detail === 'object') {
      const newBoardConfig = {
        backgroundColor: properties.backgroundColor,
        selectedShadow: properties.selectedShadow,
        selectedBoxShadowColor: properties.selectedBoxShadowColor,
        defaultText: properties.defaultText ?? '[Edit Me]',
        hasBorder: properties.hasBorder,
        defaultBorderColor: properties.defaultBorderColor
      }

      if (lastExternalEditableConfig.allowCreation != properties.allowCreation) {
        newBoardConfig.allowCreation = properties.allowCreation;
        lastExternalEditableConfig.allowCreation = properties.allowCreation;
      }

      if (lastExternalEditableConfig.allowEdit != properties.allowEdit) {
        newBoardConfig.allowEdit = properties.allowEdit;
        lastExternalEditableConfig.allowEdit = properties.allowEdit;
      }

      Object.assign(boardConfig, newBoardConfig);
      updatePostItBoard(properties.existingPostItObjects);
      sendEventConfigUpdate(boardConfig);
    };
  });

  sendEventConfigUpdate(boardConfig);

  const canvasID = properties.canvasID;
  const board = document.getElementById(canvasID);
  const getSelectionStyle = () => {
    if (boardConfig.selectedShadow) {
      return {
        boxShadow: `0 0 10px ${properties.selectedBoxShadowColor || "red"}`
      }
    }

    return {}

  };

  if (!canvasID || !board) {
    console.warn("⚠️ No canvas ID or board element found.");
    return;
  }

  board.style.position = "relative";

  // Clear the board of existing post-its to prevent duplicates
  while (board.firstChild) {
    board.removeChild(board.firstChild);
  }
  // Logger.log("🧹 Cleared board of existing post-its");

  // Global state
  const postItElements = {};
  const postItsData = new Map();
  let selectedPostIt = null;
  let selectedPostItData = null;
  let isUpdating = false;

  const publishStates = (id, text, customStyle, timeChange) => {
    Logger.log('CHANGE - PUBLISH STATE', customStyle)
    instance.publishState("customStyle", JSON.stringify(customStyle ?? {}));
    instance.publishState("postItText", text);
    instance.publishState("postItId", id);
    instance.publishState("timeChange", timeChange ?? Date.now())
  }

  const clearStates = () => {
    setTimeout(() => {
      instance.publishState("customStyle", undefined);
      instance.publishState("postItText", undefined);
      instance.publishState("postItId", undefined);
      instance.publishState("timeChange", undefined)
    }, 200)
  }

  const checkAndUpdateStyle = (newStyle) => {

    if (selectedPostIt && selectedPostItData) {
      selectedPostItData.customStyle = convertPixelToPercentage(
        { ...selectedPostItData.customStyle, ...newStyle }
      );

      Object.entries(selectedPostItData.customStyle).forEach(([key, value]) => {
        selectedPostIt.style[key] = value;
      });
      selectedPostItData.timeChange = Date.now()
      const { text, customStyle, id, timeChange } = selectedPostItData;

      publishStates(id, text, customStyle, timeChange)
      updateResizeBoxAndEditActions(selectedPostIt);

      instance.triggerEvent("postItUpdated");
    }
  }

  document.addEventListener('PostIt-updateStyle', function (event) {
    Logger.log('Event listener - PostIt-updateStyle')
    if (boardConfig.allowEdit) {
      checkAndUpdateStyle(event.detail)
    }
  })

  const sanitizeText = (text) => {
    if (!text) return "";
    return text.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, "");
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
  const loadPostItData = (existingPostItObjects = properties.existingPostItObjects, isDynamicUpdate) => {
    // Load from JSON strings
    if (existingPostItObjects && typeof existingPostItObjects.get === "function") {
      try {
        const rawPostIts = loadAllBubbleList(existingPostItObjects);
        Logger.log("🔹 Post-Data (JSON):", rawPostIts.length);

        rawPostIts.forEach(str => {
          try {
            const data = JSON.parse(str);

            Logger.log('Selected PostIt Data', selectedPostItData?.id, selectedPostIt, isDynamicUpdate)

            if (data && data.postItId) {
              const exisitngPostIt = postItsData?.get(data.postItId)
              Logger.log('TIME CHANGE', data.postItId, data.timeChange, exisitngPostIt?.timeChange)
              if (isDynamicUpdate && data.timeChange && data.timeChange < exisitngPostIt?.timeChange) {
                Logger.log('NOT UPDATE')
                return;
              }

              postItsData.set(data.postItId, {
                id: data.postItId,
                text: sanitizeText(data.text),
                customStyle: safeJsonParse(data.customStyle),
                modifiedTime: data.modifiedTime,
                timeChange: data.timeChange,
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

    Logger.log(`📊 Total unique post-its loaded: ${postItsData.size}`);
  };

  // Styling
  const fontSize = typeof properties.bubble.font_size === 'function'
    ? properties.bubble.font_size() + 'px'
    : (properties.bubble.font_size || '14px');

  // Set up defaultCustomStyle
  const defaultCustomStyle = {
    width: "100px",
    height: "100px",
    'background-color': boardConfig.backgroundColor ?? 'green',
    'border-width': '1px',
    'border-color': boardConfig.defaultBorderColor ?? '#000000',
    'font-size': fontSize,
    'font-family': 'Arial',
  }
  if (!boardConfig.hasBorder) {
    defaultCustomStyle['border-width'] = 'none';
    defaultCustomStyle['border-color'] = 'none';
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

  // Post-it management functions
  const clearSelection = () => {
    if (selectedPostIt) {
      // Reset border
      selectedPostIt.style.outline = "none";
      selectedPostIt.style.boxShadow = "none";
      selectedPostIt.style.zIndex = 500;
      // Reset text
      if (selectedPostItData) {
        selectedPostItData.innerText = selectedPostItData.text
      }
      selectedPostIt.contentEditable = false;
      updateText(selectedPostIt, selectedPostItData.id, selectedPostIt.innerText);
      selectedPostIt = null;
    }
    editTextMode = false;
    hideTextEditActions(selectedPostIt, false);

  };

  const focusPostItContent = (postIt) => {
    if (!postIt) return;
    postIt.focus();

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
    Logger.log('UPDATE PostIt - Text', newProps.text, postItData.text)

    postItsData.set(postItId, postItData);
    return postItData;
  };

  const triggerPostItUpdate = (postItId, isCreated = false) => {
    if (!postItId || !postItsData.has(postItId)) return;

    const data = postItsData.get(postItId);
    data.timeChange = Date.now()
    Logger.log('TRIGGER Update - ', performance.now(), data)
    isUpdating = true;

    publishStates(postItId, data.text, data.customStyle, data.timeChange)
    instance.triggerEvent(isCreated ? "postItCreated" : "postItUpdated");

    setTimeout(() => {
      isUpdating = false;
      // if (selectedPostIt && document.activeElement !== selectedPostIt) {
      //   focusPostItContent(selectedPostIt);
      // }
    }, 10);
  };

  const triggerPostItUpdateWithData = (postItData) => {
    Logger.log('TRIGGER Update With Data - ', performance.now(), postItData)
    postItData.timeChange = Date.now();
    isUpdating = true;
    publishStates(postItData.id, postItData.text, postItData.customStyle, postItData.timeChange);
    instance.triggerEvent("postItUpdated");
    setTimeout(() => {
      isUpdating = false;
      // if (selectedPostIt && document.activeElement !== selectedPostIt) {
      //   focusPostItContent(selectedPostIt);
      // }
    }, 10);
  };


  const updateText = (postIt, postItId, text) => {
    if (!postIt || !postItId) return;
    updatePostItData(postItId, { text });
    triggerPostItUpdate(postItId);
  };

  const resetText = (postIt, postItId) => {
    if (!postIt || !postItId) return;
    postIt.innerText = selectedPostItData?.text || '';
  };


  let resizing = false;
  let dragging = false;
  let currentHandle = null;
  let startX, startY, startW, startH, startT, startL;

  const startDragging = (e) => {
    if (!hasSelectedPostItAndAllowEdit()) return;

    startX = e.clientX;
    startY = e.clientY;
    startT = selectedPostIt.offsetTop;
    startL = selectedPostIt.offsetLeft;

    dragging = !e.target.dataset.handle; // Not resizing
  }

  // Event handlers for post-its
  const setupPostItEvents = (postIt, id) => {
    // Unified selection/focus handler
    const selectPostIt = (e) => {
      if (!boardConfig.allowEdit) {
        console.warn("⚠️ Board is not editable. Skipping post-it creation.");
        return;
      }

      isUpdating = true;
      const alreadySelected = selectedPostIt === postIt;

      if (!alreadySelected && selectedPostIt) {
        clearSelection();
      }

      Object.assign(postIt.style, getSelectionStyle());
      selectedPostIt = postIt;
      Logger.log('Mouse down - SELECT', selectedPostItData)
      selectedPostItData = postItsData.get(id);

      selectedPostIt.style.zIndex = 1000; // Bring to front  

      focusPostItContent(postIt);
      updateResizeBoxAndEditActions(selectedPostIt);
      startX = postIt.offsetLeft;
      startY = postIt.offsetTop;
      publishStates(id, postIt.innerText, selectedPostItData.customStyle);
      if (selectedPostItData) {
        document.dispatchEvent(new CustomEvent('PostIt-selected-publishStyle', {
          detail: convertToPixelValue(selectedPostItData.customStyle)
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


    // Tab key handler
    postIt.addEventListener("keydown", (e) => {
      if (e?.key === "Tab") {
        e.preventDefault();
        document.execCommand("insertHTML", false, "&nbsp;&nbsp;&nbsp;&nbsp;");
      }
    });

    postIt.addEventListener("mousedown", (e) => {
      const isAlreadySelected = selectedPostIt === postIt;
      // if a PostIt is the brand-new created, allow to edit text
      if (!hasSelectedPostItAndAllowEdit() && !(boardConfig.allowCreation && isAlreadySelected)) {
        console.warn("⚠️ Board is not editable. Skipping post-it creation.");
        return;
      }
      // Check if clicking on the post-it element itself and not on text selection
      // Remove previous check that was preventing dragging when focused
      dragStartTime = Date.now();
      postIt.style.cursor = "grabbing";
      postIt.setAttribute("data-original-z-index", postIt.style.zIndex || "auto");
      postIt.style.zIndex = 1000;

      if (!isAlreadySelected) {
        clearSelection();
      } else {
        editTextMode = true;
        selectedPostIt.contentEditable = true;
        showTextEditActions(selectedPostIt);
      }

      selectedPostIt = postIt;
      Logger.log('Mouse down - PostIt', selectedPostItData)
      selectedPostItData = postItsData.get(id);

      startDragging(e);
      updateResizeBoxAndEditActions(postIt);
    });

    document.addEventListener("mousemove", (e) => {
      if (!hasSelectedPostItAndAllowEdit()) return;

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
        // Logger.log("Resizing to:", newW, newH, "at", newL, newT);
        const newPostion = decidePostItPosition(newL, newT, newW, newH);
        // Logger.log("Resizing to:", newW, newH, "at", newL, newT);
        // Logger.log("After selection:", newPostion.width, newPostion.height, "at", newPostion.x, newPostion.y,);

        const { x, y, width, height } = newPostion;

        selectedPostIt.style.width = width;
        selectedPostIt.style.height = height;
        selectedPostIt.style.top = y;
        selectedPostIt.style.left = x;
        updateResizeBoxAndEditActions(selectedPostIt);
        Logger.log('POSTIT - Mouse Move', selectedPostIt.style.width, selectedPostIt.style.height, selectedPostItData)
        if (selectedPostItData?.customStyle) {
          selectedPostItData.customStyle.width = selectedPostIt.style.width;
          selectedPostItData.customStyle.height = selectedPostIt.style.height;
          selectedPostItData.customStyle.top = selectedPostIt.style.top;
          selectedPostItData.customStyle.left = selectedPostIt.style.left;
          Logger.log('POSTIT - Mouse Move - has custom Style', performance.now(), selectedPostItData.customStyle)
        } else if (selectedPostItData) {
          selectedPostItData.customStyle = {
            width: selectedPostIt.style.width,
            height: selectedPostIt.style.height,
            top: selectedPostIt.style.top,
            left: selectedPostIt.style.left,
          }
          Logger.log('POSTIT - Mouse Move - Not have customStyle', performance.now(), selectedPostItData.customStyle)
        }
      } else if (dragging) {
        const newLeft = startL + dx;
        const newTop = startT + dy;
        if (selectedPostItData) {
          Logger.log("DRAGGING - position - before", newLeft, newTop, selectedPostItData.customStyle.width, selectedPostItData.customStyle.height)
          const newPosition = decidePostItPosition(newLeft, newTop,
            selectedPostItData.customStyle.width, selectedPostItData.customStyle.height);
          Logger.log("DRAGGING - position - after", newLeft, newTop, newPosition.width, newPosition.height)

          selectedPostIt.style.left = newPosition.x;
          selectedPostIt.style.top = newPosition.y;
          selectedPostItData.customStyle.top = selectedPostIt.style.top;
          selectedPostItData.customStyle.left = selectedPostIt.style.left;
          Logger.log('POSTIT - Mouse DRAGGING - has custom Style', performance.now(), selectedPostItData)
          updateResizeBoxAndEditActions(selectedPostIt);
        }

      }
    });

    // === Mouse up ===
    document.addEventListener("mouseup", () => {
      if (resizing || dragging) {
        resizing = false;
        dragging = false;

        if (selectedPostItData) {
          triggerPostItUpdateWithData(selectedPostItData);
          document.dispatchEvent(new CustomEvent('PostIt-selected-publishStyle', {
            detail: convertToPixelValue(selectedPostItData.customStyle)
          }));
        }

      }
    });
  };

  let boardRectangle;

  function roundUp(num, decimalNumbers = 7) {
    const divident = Math.pow(10, decimalNumbers)
    return Math.ceil(num * divident) / divident;
  }

  const convertToNumber = (number) => {
    return Number.parseFloat(number)
  }

  const convertToPixel = (number, border) => {
    if (typeof number === "string" && number.endsWith("%")) {
      return Math.round(parseFloat(number) * border / 100);
    }

    return parseFloat(number);
  }

  const decidePostItPosition = (left, top, width = 0, height = 0) => {
    if (!boardRectangle) {
      boardRectangle = board.getBoundingClientRect();
    }

    left = convertToPixel(left, boardRectangle.width);
    top = convertToPixel(top, boardRectangle.height);
    width = convertToPixel(width, boardRectangle.width);
    height = convertToPixel(height, boardRectangle.height);

    const newX = Math.max(0, Math.min(left, boardRectangle.width - parseFloat(width)));
    const newY = Math.max(0, Math.min(top, boardRectangle.height - parseFloat(height)));
    const newWidth = Math.max(30, Math.min(parseFloat(width), boardRectangle.width - newX));
    const newHeight = Math.max(30, Math.min(parseFloat(height), boardRectangle.height - newY));

    return {
      x: convertToPercentage(newX, boardRectangle.width),
      y: convertToPercentage(newY, boardRectangle.height),
      width: convertToPercentage(newWidth, boardRectangle.width),
      height: convertToPercentage(newHeight, boardRectangle.height),
    };
  }

  const convertToPercentage = (value, border) => {
    if (typeof value === "string" && value.endsWith("%")) {
      return value;
    }

    return roundUp(Number.parseFloat(value) / border) * 100 + "%"
  }

  const convertPixelToPercentage = (customStyle = {}) => {
    const { top = 0, left = 0, width = 0, height = 0 } = customStyle;

    if (!boardRectangle) {
      boardRectangle = board.getBoundingClientRect();
    }

    return {
      ...customStyle,
      left: convertToPercentage(left, boardRectangle.width),
      top: convertToPercentage(top, boardRectangle.height),
      width: convertToPercentage(width, boardRectangle.width),
      height: convertToPercentage(height, boardRectangle.height),
    };
  }


  const convertToPixelValue = (customStyle = {}) => {
    let { top = 0, left = 0, width = 0, height = 0 } = customStyle;
    if (!boardRectangle) {
      boardRectangle = board.getBoundingClientRect();
    }

    left = convertToNumber(left);
    top = convertToNumber(top);
    width = convertToNumber(width);
    height = convertToNumber(height);

    return {
      ...customStyle,
      left: Math.round(left / 100 * boardRectangle.width),
      top: Math.round(top / 100 * boardRectangle.height),
      width: Math.round(width / 100 * boardRectangle.width),
      height: Math.round(height / 100 * boardRectangle.height),
    };
  }


  // Create and render a post-it note
  const createPostIt = (postItData) => {
    if (!postItData || !postItData.id) return null;
    const id = postItData.id;

    if (postItElements[id]) {
      const existingPostIt = postItElements[id];
      const existingPostItData = postItsData.get(id);
      // If a PostIt is Editing mode, don't update it
      if (id === selectedPostItData?.id && selectedPostIt.contentEditable == "true") {
        return existingPostIt;
      }

      if (!existingPostItData.timeChange || existingPostItData.timeChange >= postItData.timeChange) {
        Object.assign(existingPostIt.style, postItData.customStyle);
        existingPostIt.innerText = postItData.text;
      }
      if (selectedPostItData?.id === id && selectedPostIt.contentEditable == "true") {
        focusPostItContent(existingPostIt);
      }

      return existingPostIt;
    }

    const postIt = document.createElement("div");
    postIt.setAttribute('data-scope', 'postIt-plugin');
    Object.assign(postIt.style, postItStyle);
    postIt.innerText = postItData.text;

    if (postItData.customStyle) {
      Object.entries(postItData.customStyle).forEach(([key, value]) => {
        postIt.style[key] = value;
      })
    }

    if (!postIt.style.backgroundColor) {
      postIt.style.backgroundColor = boardConfig.backgroundColor ?? 'green';
    }

    postIt.setAttribute("data-postit-id", id);

    postItElements[id] = postIt;
    board.appendChild(postIt);

    setupPostItEvents(postIt, id);

    return postIt;
  };

  // === Resize Box Overlay ===
  const resizeBox = document.createElement("div");
  resizeBox.setAttribute('data-scope', 'postIt-plugin');
  resizeBox.style.position = "absolute";
  resizeBox.style.border = "2px solid #007bff";
  resizeBox.style.display = "none";
  resizeBox.style.pointerEvents = "none";
  resizeBox.style.zIndex = 1002;
  resizeBox.style.boxSizing = "border-box";
  board.appendChild(resizeBox);

  // Editable Content
  let editTextMode = false;

  const setPostItEditButtonStyle = (element, title) => {
    element.style.position = "absolute";
    element.style.top = "-14px";
    element.style.width = "25px";
    element.style.height = "22px";
    element.style.background = "#fff"; // white background
    element.style.borderRadius = "6px"; // slightly rounded
    element.style.display = "flex";
    element.style.alignItems = "center";
    element.style.textAlign = "center";
    element.style.justifyContent = "center";
    element.style.cursor = "pointer";
    element.style.display = "none"; // only show on select
    element.style.boxShadow = "0 4px 10px rgba(0,0,0,0.25)";
    element.style.zIndex = "1002";
    element.title = title;
    element.style.userSelect = "none";
  }


  const deleteBtn = document.createElement("div");
  deleteBtn.setAttribute('data-scope', 'postIt-plugin');
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
  setPostItEditButtonStyle(deleteBtn, "Delete");

  board.appendChild(deleteBtn);
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (selectedPostIt && confirm("Are you sure you want to delete this item?")) {
      board.removeChild(selectedPostIt);
      resizeBox.style.display = "none";
      deleteBtn.style.display = "none";
      instance.publishState("postItId", selectedPostIt.getAttribute("data-postit-id"));
      instance.triggerEvent("postItDeleted");
      clearStates()
    }
  });


  const textSaveBtn = document.createElement("div");
  textSaveBtn.setAttribute('data-scope', 'postIt-plugin');
  textSaveBtn.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
     fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
     viewBox="0 0 24 24">
  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
  <rect x="7" y="3" width="8" height="4" rx="1" ry="1"></rect>
  <path d="M17 21V13H7v8"></path>
</svg>

`;
  setPostItEditButtonStyle(textSaveBtn, "Save Text");
  board.appendChild(textSaveBtn);
  textSaveBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (selectedPostIt && selectedPostItData) {
      editTextMode = false;
      selectedPostIt.contentEditable = false;
      hideTextEditActions(selectedPostIt);
      updateText(selectedPostIt, selectedPostItData.id, selectedPostIt.innerText);
    }
  });

  const textCancelBtn = document.createElement("div");
  textCancelBtn.setAttribute('data-scope', 'postIt-plugin');
  textCancelBtn.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
     fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
     viewBox="0 0 24 24">
  <path d="M18 6L6 18"></path>
  <path d="M6 6l12 12"></path>
</svg>


`;
  setPostItEditButtonStyle(textCancelBtn, "Cancel Edit Text");
  board.appendChild(textCancelBtn);
  textCancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (selectedPostIt && selectedPostItData) {
      editTextMode = false;
      selectedPostIt.contentEditable = false;
      hideTextEditActions(selectedPostIt);
      resetText(selectedPostIt, selectedPostItData.id);
    }
  });


  const handlePositions = ["top", "right", "bottom", "left", "topleft", "topright", "bottomleft", "bottomright"];
  const handles = {};

  handlePositions.forEach(pos => {
    const h = document.createElement("div");;;
    h.setAttribute('data-scope', 'postIt-plugin');
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

  function updateResizeBoxAndEditActions(el) {
    // temporary settings
    resizeBox.style.display = "block";
    resizeBox.style.top = selectedPostItData?.customStyle?.top;
    resizeBox.style.left = selectedPostItData?.customStyle?.left;
    resizeBox.style.width = selectedPostItData?.customStyle?.width;
    resizeBox.style.height = selectedPostItData?.customStyle?.height;


    if (boardConfig.allowEdit) {
      deleteBtn.style.top = (el.offsetTop - 25) + "px";
      deleteBtn.style.left = (el.offsetLeft + el.offsetWidth - 30) + "px";
      deleteBtn.style.display = "block";
    }
    
    selectedPostIt.contentEditable = editTextMode;

    positionHandles();
    updateTextEditActionsPosition(el);
  }

  function showTextEditActions(el) {
    updateTextEditActionsPosition(el);
    textSaveBtn.style.display = "block";
    textCancelBtn.style.display = "block";
    deleteBtn.style.display = "none";
  }

  function updateTextEditActionsPosition(el) {
    textSaveBtn.style.top = (el.offsetTop - 25) + "px";
    textSaveBtn.style.left = (el.offsetLeft + el.offsetWidth - 60) + "px";

    textCancelBtn.style.top = (el.offsetTop - 25) + "px";
    textCancelBtn.style.left = (el.offsetLeft + el.offsetWidth - 30) + "px";
  }

  function hideTextEditActions(el, showDeletePostItButton = true) {
    textSaveBtn.style.display = "none";
    textCancelBtn.style.display = "none";

    if (showDeletePostItButton && el) {
      deleteBtn.style.display = "block";
      deleteBtn.style.top = (el.offsetTop - 25) + "px";
      deleteBtn.style.left = (el.offsetLeft + el.offsetWidth - 30) + "px";
    }
  }

  // === Resize start ===
  Object.values(handles).forEach(h => {
    h.addEventListener("mousedown", (e) => {
      e.preventDefault();
      if (!selectedPostIt || !boardConfig.allowEdit) return;

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

      if (!boardConfig.allowCreation) {
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
        text: boardConfig.defaultText ?? "[edit me]",
        customStyle: {
          ...defaultCustomStyle,
          left: newPosition?.x ? newPosition.x : "0",
          top: newPosition?.y ? newPosition.y : "0",
          width: newPosition?.width ? newPosition.width : "0",
          height: newPosition?.height ? newPosition.height : "0",
        }
      };
      postItsData.set(newId, newPostItData);

      const postIt = createPostIt(newPostItData);

      if (postIt) {
        selectedPostIt = postIt;
        Logger.log('BOARD - Click', selectedPostItData)
        selectedPostItData = newPostItData;
        updateResizeBoxAndEditActions(selectedPostIt)
        Object.assign(postIt.style, getSelectionStyle());
        setTimeout(() => focusPostItContent(postIt), 50);
        triggerPostItUpdate(newId, true);
        document.dispatchEvent(new CustomEvent('PostIt-selected-publishStyle', {
          detail: convertToPixelValue(selectedPostItData.customStyle),
        }));
      }
    });

    document.addEventListener("click", (event) => {
      if (event.target === board || event.target.dataset.scope === 'postIt-plugin') {
        return
      }
      clearSelection();
      resetResizeBox();
    })

    // Delete selected post-it with DEL key
    document.addEventListener("keydown", (e) => {
      if (!boardConfig.allowEdit) {
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
        clearStates();
      }
    });

    instance.data.eventAttached = true;
  };

  const resetResizeBox = () => {
    resizeBox.style.display = "none";
    deleteBtn.style.display = "none";
    if (selectedPostIt) {
      selectedPostIt.style.zIndex = 500;
      selectedPostIt = null;
    }
    clearStates();
  }

  document.addEventListener("PostIt-editable-config", (event) => {
    if (event.detail && typeof event.detail === 'object') {
      boardConfig.allowCreation = event.detail.allowCreation !== undefined ? event.detail.allowCreation : boardConfig.allowCreation;
      boardConfig.allowEdit = event.detail.allowEdit !== undefined ? event.detail.allowEdit : boardConfig.allowEdit;
      if (!boardConfig.allowCreation && !boardConfig.allowEdit) {
        resetResizeBox();
      }
    }
  })

  window.addEventListener("resize", () => {
    resizeBox.style.display = "none";
    deleteBtn.style.display = "none";
    clearSelection();
    selectedPostIt = undefined;
    selectedPostItData = undefined;
    boardRectangle = undefined;
  });


  const updatePostItBoard = (existingPostItObjects) => {
    loadPostItData(existingPostItObjects, true);
    selectedPostItData = postItsData.get(selectedPostIt?.getAttribute("data-postit-id"));
    postItsData.forEach(postItData => {
      createPostIt(postItData)
    })
  }

  // Main execution
  loadPostItData();
  postItsData.forEach((data) => createPostIt(data));
  setupBoardEvents();
  instance.data.has_initialized = true;
  Logger.log(`📊 Created ${Object.keys(postItElements).length} post-its on the board`);
}
