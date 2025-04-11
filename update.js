function(instance, properties, context) {
    if (instance.data.initialized) return; // Prevent running multiple times
    instance.data.initialized = true;

    console.log("✅ Updating Post-It Board...");

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

    const existingPostItObjects = Array.isArray(properties.existingPostItObjects) ? properties.existingPostItObjects : [];
    if (existingPostItObjects.length === 0) {
        console.log("🔹 No existing Post-Its to render.");
    }

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

    function createPostIt(x, y, text, postItId) {
        const postIt = document.createElement("div");
        postIt.classList.add("post-it");

        Object.assign(postIt.style, postItStyle);
        postIt.contentEditable = "true";
        postIt.innerText = text;

        postIt.setAttribute("data-postit-id", postItId);

        postIt.style.left = x + "px";
        postIt.style.top = y + "px";

        return postIt;
    }

    existingPostItObjects.forEach(postItObject => {
        const x = postItObject[properties.xField] || 0;
        const y = postItObject[properties.yField] || 0;
        const postItId = postItObject[properties.postItId] || "pi_" + Math.random().toString(36).substr(2, 12);
        const text = postItObject[properties.textField] || "Existing Post-It";

        console.log(`🖱 Rendering existing Post-It at: ${x}, ${y}`);

        const postIt = createPostIt(x, y, text, postItId);
        board.appendChild(postIt);

        postIt.addEventListener("click", function() {
            console.log("🔹 Clicked on an existing Post-It.");

            instance.publishState("postItX", x);
            instance.publishState("postItY", y);
            instance.publishState("postItText", postIt.innerText);
            instance.publishState("postItId", postIt.getAttribute("data-postit-id"));

            instance.triggerEvent("postItClicked");
            console.log("✅ Triggered 'postItClicked' event.");
        });

        enableDrag(postIt, instance, board);
    });

    if (!instance.data.eventAttached) {
        board.addEventListener("click", function(event) {
            if (event.target.classList.contains("post-it")) {
                console.log("🔹 Clicked on an existing Post-It. Skipping creation.");
                return;
            }

            const boardRect = board.getBoundingClientRect();
            const x = Math.round(event.clientX - boardRect.left);
            const y = Math.round(event.clientY - boardRect.top);

            console.log("🖱 Click at:", x, y);

            const newPostItId = "pi_" + Math.random().toString(36).substr(2, 12);
            const postIt = createPostIt(x, y, "New Post-It", newPostItId);

            board.appendChild(postIt);

            instance.publishState("postItX", x);
            instance.publishState("postItY", y);
            instance.publishState("postItText", "New Post-It");
            instance.publishState("postItId", newPostItId);
            instance.triggerEvent("postItCreated");

            console.log("✅ Triggered 'postItCreated' event.");

            enableDrag(postIt, instance, board);
        });

        instance.data.eventAttached = true;
    }

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
                instance.publishState("postItText", postIt.innerText);
                instance.publishState("postItId", postIt.getAttribute("data-postit-id"));
            }
        });

        document.addEventListener("mouseup", function() {
            if (isDragging) {
                console.log("✅ Drag end at:", postIt.style.left, postIt.style.top);
                postIt.style.cursor = "grab";
                isDragging = false;

                instance.triggerEvent("postItUpdated");
                console.log("✅ Triggered 'postItUpdated' event.");
            }
        });

        postIt.addEventListener("input", function() {
            console.log("✏ Editing Post-It:", postIt.innerText);

            instance.publishState("postItText", postIt.innerText);
            instance.publishState("postItId", postIt.getAttribute("data-postit-id"));
            instance.triggerEvent("postItUpdated");
            console.log("✅ Triggered 'postItUpdated' event.");
        });
    }
}
