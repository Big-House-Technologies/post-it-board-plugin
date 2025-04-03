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

    board.addEventListener("click", function(event) {
        if (event.target.classList.contains("post-it")) {
            console.log("🔹 Clicked on an existing Post-It. Skipping creation.");
            return;
        }

        const boardRect = board.getBoundingClientRect();
        const x = event.clientX - boardRect.left;
        const y = event.clientY - boardRect.top;

        console.log("🖱 Click at:", x, y);

        const postIt = document.createElement("div");
        postIt.classList.add("post-it");
        postIt.style.position = "absolute";
        postIt.style.left = x + "px";
        postIt.style.top = y + "px";
        postIt.style.width = "100px";
        postIt.style.height = "100px";
        postIt.style.background = "yellow";
        postIt.style.border = "1px solid black";
        postIt.style.padding = "10px";
        postIt.style.cursor = "grab";
        postIt.style.userSelect = "none";
        postIt.contentEditable = "true";
        postIt.innerText = "New Post-It";

        console.log("📌 Creating Post-It at:", x, y);

        board.appendChild(postIt);

        instance.publishState("postItX", x);
        instance.publishState("postItY", y);
        instance.publishState("postItText", "New Post-It");
        instance.triggerEvent("postItCreated");

        console.log("✅ Triggered 'postItCreated' event.");

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

                // 🔹 Enforce boundaries (prevent dragging outside the canvas)
                const minX = 0;
                const minY = 0;
                const maxX = boardRect.width - postItWidth;
                const maxY = boardRect.height - postItHeight;

                const constrainedX = Math.max(minX, Math.min(newX, maxX));
                const constrainedY = Math.max(minY, Math.min(newY, maxY));

                console.log(`📍 Dragging: ${constrainedX}, ${constrainedY} | Bounds: (${minX}, ${maxX}), (${minY}, ${maxY})`);

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

        postIt.addEventListener("input", function() {
            console.log("✏ Editing Post-It:", postIt.innerText);

            instance.publishState("postItText", postIt.innerText);
            instance.triggerEvent("postItUpdated");

            console.log("✅ Triggered 'postItUpdated' event.");
        });
    });
}
