function(instance, properties, context) {
    console.log("✅ Initializing Post-It Board...");

    const canvasID = properties.canvasID;
    console.log("🔹 Canvas ID:", canvasID);

    if (!canvasID) {
        console.warn("⚠️ No canvas ID provided.");
        return;
    }

    const board = document.getElementById(canvasID);
    if (!board) {
        console.warn("⚠️ Canvas not found. Skipping initialization.");
        return;
    }

    board.style.position = "relative";
    console.log("✅ Post-It Board found and ready.");

    // Ensure existingPostIts is an array
    const existingPostIts = Array.isArray(properties.existingPostIts) ? properties.existingPostIts : [];
    if (existingPostIts.length === 0) {
        console.log("🔹 No existing Post-Its to render.");
    }

    // Define the common styles for all Post-Its
    const postItStyle = {
        position: "absolute",
        width: "100px",
        height: "100px",
        background: "yellow",
        border: "1px solid black",
        padding: "10px",
        cursor: "grab",
        userSelect: "none"
    };

    // Render existing Post-Its
    existingPostIts.forEach(postItObject => {
        const x = postItObject[properties.xField] || 0;
        const y = postItObject[properties.yField] || 0;

        console.log(`🖱 Rendering existing Post-It at: ${x}, ${y}`);

        const postIt = document.createElement("div");
        postIt.classList.add("post-it");
        postIt.style.position = postItStyle.position;
        postIt.style.width = postItStyle.width;
        postIt.style.height = postItStyle.height;
        postIt.style.background = postItStyle.background;
        postIt.style.border = postItStyle.border;
        postIt.style.padding = postItStyle.padding;
        postIt.style.cursor = postItStyle.cursor;
        postIt.style.userSelect = postItStyle.userSelect;
        postIt.contentEditable = "true";
        postIt.innerText = postItObject[properties.textField] || "Existing Post-It";

        // Set the unique Post-It ID
        postIt.setAttribute("data-postit-id", postItObject[properties.postItObject].id); // Assuming 'id' is the field containing the Post-It's unique identifier

        postIt.style.left = x + "px";
        postIt.style.top = y + "px";

        board.appendChild(postIt);

        // Add drag behavior for existing Post-Its
        enableDrag(postIt, instance, board);
    });

    // Add click event to create new Post-Its
    board.addEventListener("click", function(event) {
        if (event.target.classList.contains("post-it")) {
            console.log("🔹 Clicked on an existing Post-It. Skipping creation.");
            return;
        }

        const boardRect = board.getBoundingClientRect();
        const x = Math.round(event.clientX - boardRect.left);
        const y = Math.round(event.clientY - boardRect.top);

        console.log("🖱 Click at:", x, y);

        const postIt = document.createElement("div");
        postIt.classList.add("post-it");
        postIt.style.position = postItStyle.position;
        postIt.style.width = postItStyle.width;
        postIt.style.height = postItStyle.height;
        postIt.style.background = postItStyle.background;
        postIt.style.border = postItStyle.border;
        postIt.style.padding = postItStyle.padding;
        postIt.style.cursor = postItStyle.cursor;
        postIt.style.userSelect = postItStyle.userSelect;
        postIt.contentEditable = "true";
        postIt.innerText = "New Post-It";

        // Create a unique ID for the Post-It
        const postItId = "pi_" + Math.random().toString(36).substr(2, 14); // Generates a unique 16-character ID starting with 'pi_'
        postIt.setAttribute("data-postit-id", postItId);
        console.log("📌 Creating Post-It with ID:", postItId);

        postIt.style.left = x + "px";
        postIt.style.top = y + "px";

        board.appendChild(postIt);

        // Publish state for the newly created post-it
        instance.publishState("postItX", x);
        instance.publishState("postItY", y);
        instance.publishState("postItText", "New Post-It");
        instance.publishState("postItId", postItId); // Store unique ID in state
        instance.triggerEvent("postItCreated");

        console.log("✅ Triggered 'postItCreated' event.");

        // Enable drag functionality for the new Post-It
        enableDrag(postIt, instance, board);
    });

    // Helper function to enable dragging for Post-Its (both new and existing)
    function enableDrag(postIt, instance, board) {
        let offsetX, offsetY, isDragging = false;

        postIt.addEventListener("mousedown", function(e) {
            console.log("🖐 Drag start");
            isDragging = true;
            offsetX = e.clientX - postIt.offsetLeft;
            offsetY = e.clientY - postIt.offsetTop;
            postIt.style.cursor = "grabbing";
        });

        document.addEventListener("mousemove", function(e) {
            if (isDragging) {
                const boardRect = board.getBoundingClientRect();
                const postItWidth = postIt.clientWidth;
                const postItHeight = postIt.clientHeight;

                const newX = e.clientX - offsetX;
                const newY = e.clientY - offsetY;

                // Enforce boundaries (prevent dragging outside the canvas)
                const minX = 0;
                const minY = 0;
                const maxX = boardRect.width - postItWidth;
                const maxY = boardRect.height - postItHeight;

                const constrainedX = Math.round(Math.max(minX, Math.min(newX, maxX)));
                const constrainedY = Math.round(Math.max(minY, Math.min(newY, maxY)));

                postIt.style.left = constrainedX + "px";
                postIt.style.top = constrainedY + "px";

                instance.publishState("postItX", constrainedX);
                instance.publishState("postItY", constrainedY);
            }
        });

        document.addEventListener("mouseup", function() {
            if (isDragging) {
                console.log("✅ Drag end at:", postIt.style.left, postIt.style.top);
                postIt.style.cursor = "grab";
                isDragging = false;

                instance.triggerEvent("postItMoved");
                console.log("✅ Triggered 'postItMoved' event.");
            }
        });

        // Handle text edits for the post-it
        postIt.addEventListener("input", function() {
            console.log("✏ Editing Post-It:", postIt.innerText);
            instance.publishState("postItText", postIt.innerText);
            instance.triggerEvent("postItUpdated");
            console.log("✅ Triggered 'postItUpdated' event.");
        });
    }
}
