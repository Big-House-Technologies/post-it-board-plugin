function(instance, properties, context) {
    
    if (instance.data.has_initialized === true) {
  console.log("✅ Already initialized. Skipping...");
  return;
}

  console.log("✅ Initializing Post-It Board");
    
    
  
  const canvasID = properties.canvasID;
  const board = document.getElementById(canvasID);
  
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
  let isUpdating = false;
  
  // Helper functions
  const debounce = (func, wait) => {
    let timeout;
    return function(...args) {
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
                x: data.x || 0,
                y: data.y || 0,
                text: sanitizeText(data.text || "Post-It")
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
    
    // Load from Bubble Things API
    if (properties.existingPostItObjects2 && typeof properties.existingPostItObjects2.get === "function") {
      try {
        const rawPostIts2 = loadAllBubbleList(properties.existingPostItObjects2);
        console.log("🔹 Post-Data (Things):", rawPostIts2.length);
        
        if (rawPostIts2.length > 0 && typeof rawPostIts2[0].listProperties === "function") {
          rawPostIts2.forEach(item => {
            try {
              if (typeof item.get === "function") {
                const id = item.get("plugin_id_text");
                if (id && !postItsData.has(id)) {
                  postItsData.set(id, {
                    id: id,
                    x: item.get("x_position_number") || 0,
                    y: item.get("y_position_number") || 0,
                    text: sanitizeText(item.get("content_text") || "Post-It")
                  });
                }
              }
            } catch (err) {
              console.warn("⚠️ Error processing Thing item:", err);
            }
          });
        }
      } catch (err) {
        if (err.message === 'not ready') throw err;
        console.warn("⚠️ Error processing Bubble objects2:", err);
      }
    }
    
    console.log(`📊 Total unique post-its loaded: ${postItsData.size}`);
  };
  
  // Styling
  const fontSize = typeof properties.bubble.font_size === 'function' 
      ? properties.bubble.font_size() + 'px' 
      : (properties.bubble.font_size || '14px');
  
  const postItStyle = {
    position: "absolute",
    width: "100px",
    height: "100px",
    background: "yellow",
    border: "1px solid black",
    padding: "10px",
    cursor: "grab",
    userSelect: "none",
    fontSize: fontSize,
    overflow: "auto"
  };

  const getSelectionStyle = () => ({
    outline: `${properties.selected_width_border || 2}px solid ${properties.selected_color || "red"}`,
    boxShadow: properties.selected_shadow ? `0 0 10px ${properties.selected_color || "red"}` : "none"
  });
  
  // Post-it management functions
  const clearSelection = () => {
    if (selectedPostIt) {
      selectedPostIt.style.outline = "none";
      selectedPostIt.style.boxShadow = "none";
      selectedPostIt = null;
    }
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
    
    postItsData.set(postItId, postItData);
    return postItData;
  };
  
  const triggerPostItUpdate = (postItId, isCreated = false) => {
    if (!postItId || !postItsData.has(postItId)) return;
    
    const data = postItsData.get(postItId);
    isUpdating = true;
    
    instance.publishState("postItX", data.x);
    instance.publishState("postItY", data.y);
    instance.publishState("postItText", data.text);
    instance.publishState("postItId", postItId);
    
    instance.triggerEvent(isCreated ? "postItCreated" : "postItUpdated");
    
    setTimeout(() => {
      isUpdating = false;
      if (selectedPostIt && document.activeElement !== selectedPostIt) {
        focusPostItContent(selectedPostIt);
      }
    }, 10);
  };
  
  const debouncedTextUpdate = debounce((postIt, postItId, text) => {
    if (!postIt || !postItId) return;
    updatePostItData(postItId, { text });
    triggerPostItUpdate(postItId);
  }, 700);
  
  // Event handlers for post-its
  const setupPostItEvents = (postIt, id) => {
    // Unified selection/focus handler
    const selectPostIt = (e) => {
      const alreadySelected = selectedPostIt === postIt;
      
      if (!alreadySelected && selectedPostIt) {
        clearSelection();
      }
      
      selectedPostIt = postIt;
      Object.assign(postIt.style, getSelectionStyle());
      focusPostItContent(postIt);
      
      instance.publishState("postItX", parseInt(postIt.style.left));
      instance.publishState("postItY", parseInt(postIt.style.top));
      instance.publishState("postItText", postIt.innerText);
      instance.publishState("postItId", id);
      
      if (!alreadySelected) {
        instance.triggerEvent("postItSelected");
      }
      
      if (e) e.stopPropagation();
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
      if (e.key === "Tab") {
        e.preventDefault();
        document.execCommand("insertHTML", false, "&nbsp;&nbsp;&nbsp;&nbsp;");
      }
    });
    
    // Drag handling
    let isDragging = false;
    let offsetX = 0, offsetY = 0;
    let startX = 0, startY = 0;
    let dragStartTime = 0;
    
    postIt.addEventListener("mousedown", (e) => {
      // Check if clicking on the post-it element itself and not on text selection
      // Remove previous check that was preventing dragging when focused
      
      isDragging = true;
      dragStartTime = Date.now();
      offsetX = e.clientX - postIt.offsetLeft;
      offsetY = e.clientY - postIt.offsetTop;
      startX = parseInt(postIt.style.left) || 0;
      startY = parseInt(postIt.style.top) || 0;
      postIt.style.cursor = "grabbing";
      postIt.setAttribute("data-original-z-index", postIt.style.zIndex || "auto");
      postIt.style.zIndex = "1000";
      
      // Temporarily disable content editing during drag
      if (document.activeElement === postIt) {
        // Save selection for later
        const savedSelection = window.getSelection();
        postIt.setAttribute('data-had-focus', 'true');
        postIt.blur();
      }
      
      e.preventDefault();
      e.stopPropagation();
    });
    
    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      
      const rect = board.getBoundingClientRect();
      const newX = Math.max(0, Math.min(e.clientX - offsetX, rect.width - postIt.offsetWidth));
      const newY = Math.max(0, Math.min(e.clientY - offsetY, rect.height - postIt.offsetHeight));
      
      postIt.style.left = `${newX}px`;
      postIt.style.top = `${newY}px`;
      
      instance.publishState("postItX", newX);
      instance.publishState("postItY", newY);
      instance.publishState("postItText", sanitizeText(postIt.innerText));
      instance.publishState("postItId", id);
    });
    
    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      
      isDragging = false;
      postIt.style.cursor = "grab";
      postIt.style.zIndex = postIt.getAttribute("data-original-z-index");
      
      const endX = parseInt(postIt.style.left) || 0;
      const endY = parseInt(postIt.style.top) || 0;
      const wasDragged = startX !== endX || startY !== endY;
      
      if (wasDragged) {
        updatePostItData(id, { x: endX, y: endY });
        triggerPostItUpdate(id);
      } else if (Date.now() - dragStartTime < 200) {
        selectPostIt();
      }
      
      // Restore focus after dragging if the post-it had focus before
      if (postIt.getAttribute('data-had-focus') === 'true') {
        postIt.setAttribute('data-had-focus', 'false');
        setTimeout(() => {
          postIt.focus();
          focusPostItContent(postIt);
        }, 10);
      }
    });
  };
  
  // Create and render a post-it note
  const createPostIt = (postItData) => {
    if (!postItData || !postItData.id) return null;
    
    const id = postItData.id;
    
    if (postItElements[id]) {
      const existingPostIt = postItElements[id];
      existingPostIt.style.left = `${postItData.x}px`;
      existingPostIt.style.top = `${postItData.y}px`;
      existingPostIt.innerText = postItData.text;
      return existingPostIt;
    }
    
    const postIt = document.createElement("div");
    Object.assign(postIt.style, postItStyle);
    postIt.contentEditable = "true";
    postIt.innerText = postItData.text;
    postIt.style.left = `${postItData.x}px`;
    postIt.style.top = `${postItData.y}px`;
    postIt.setAttribute("data-postit-id", id);
    
    postItElements[id] = postIt;
    board.appendChild(postIt);
    
    setupPostItEvents(postIt, id);
    
    return postIt;
  };
  
  // Set up board-level events
  const setupBoardEvents = () => {
    if (instance.data.eventAttached) return;
    
    // Create new post-it on board click
    board.addEventListener("click", (event) => {
      if (event.target !== board) return;
      
      clearSelection();
      
      const rect = board.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const newId = "pi_" + Math.random().toString(36).substr(2, 12);
      
      const postItData = { id: newId, x, y, text: "New Post-It" };
      postItsData.set(newId, postItData);
      
      const postIt = createPostIt(postItData);
      if (postIt) {
        selectedPostIt = postIt;
        Object.assign(postIt.style, getSelectionStyle());
        setTimeout(() => focusPostItContent(postIt), 50);
        triggerPostItUpdate(newId, true);
      }
    });
    
    // Delete selected post-it with DEL key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Delete" && selectedPostIt) {
        const id = selectedPostIt.getAttribute("data-postit-id");
        
        board.removeChild(selectedPostIt);
        delete postItElements[id];
        postItsData.delete(id);
        
        selectedPostIt = null;
        
        instance.publishState("postItId", id);
        instance.triggerEvent("postItDeleted");
      }
    });
    
    instance.data.eventAttached = true;
  };
  
  // Main execution
  loadPostItData();
  postItsData.forEach((data) => createPostIt(data));
  setupBoardEvents();
    
    instance.data.has_initialized = true;

  
  console.log(`📊 Created ${Object.keys(postItElements).length} post-its on the board`);
}
  