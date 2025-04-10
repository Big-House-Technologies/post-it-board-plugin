function(instance, context) {
    instance.data.renderExistingPostIts = (canvasID, postItObjects, properties, instance) => {
        // Clear existing Post-Its
        const board = document.getElementById(canvasID);
        if (!board) {
            console.warn("⚠️ Board not found with ID:", canvasID);
            return;
        }

        board.innerHTML = ""; // Reset canvas
        board.style.position = "relative";

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

        const createPostIt = (x, y, text, postItId) => {
            const postIt = document.createElement("div");
            postIt.classList.add("post-it");
            Object.assign(postIt.style, postItStyle);
            postIt.contentEditable = "true";
            postIt.innerText = text;
            postIt.setAttribute("data-postit-id", postItId);
            postIt.style.left = x + "px";
            postIt.style.top = y + "px";
            return postIt;
        };

        postItObjects.forEach(postItObject => {
            const x = postItObject[properties.xField] || 0;
            const y = postItObject[properties.yField] || 0;
            const text = postItObject[properties.textField] || "Existing Post-It";
            const postItId = postItObject[properties.postItObject]?.id || "pi_" + Math.random().toString(36).substr(2, 14);
            const postIt = createPostIt(x, y, text, postItId);
            board.appendChild(postIt);

            // Click to expose states
            postIt.addEventListener("click", () => {
                instance.publishState("postItX", x);
                instance.publishState("postItY", y);
                instance.publishState("postItText", postIt.innerText);
                instance.publishState("postItId", postItId);
                instance.triggerEvent("postItClicked");
            });

            // Dragging and input handled below
            enableDrag(postIt, instance, board);
        });

        // Canvas click to create new Post-It
        board.addEventListener("click", function(event) {
            if (event.target.classList.contains("post-it")) return;
            const boardRect = board.getBoundingClientRect();
            const x = Math.round(event.clientX - boardRect.left);
            const y = Math.round(event.clientY - boardRect.top);
            const postItId = "pi_" + Math.random().toString(36).substr(2, 14);
            const postIt = createPostIt(x, y, "New Post-It", postItId);
            board.appendChild(postIt);
            instance.publishState("postItX", x);
            instance.publishState("postItY", y);
            instance.publishState("postItText", "New Post-It");
            instance.publishState("postItId", postItId);
            instance.triggerEvent("postItCreated");
            enableDrag(postIt, instance, board);
        });

        function enableDrag(postIt, instance, board) {
            let offsetX, offsetY, isDragging = false;

            postIt.addEventListener("mousedown", function(e) {
                isDragging = true;
                offsetX = e.clientX - postIt.offsetLeft;
                offsetY = e.clientY - postIt.offsetTop;
                postIt.style.cursor = "grabbing";
            });

            document.addEventListener("mousemove", function(e) {
                if (!isDragging) return;
                const boardRect = board.getBoundingClientRect();
                const newX = e.clientX - offsetX;
                const newY = e.clientY - offsetY;
                const maxX = boardRect.width - postIt.clientWidth;
                const maxY = boardRect.height - postIt.clientHeight;
                const constrainedX = Math.max(0, Math.min(newX, maxX));
                const constrainedY = Math.max(0, Math.min(newY, maxY));
                postIt.style.left = constrainedX + "px";
                postIt.style.top = constrainedY + "px";
                instance.publishState("postItX", constrainedX);
                instance.publishState("postItY", constrainedY);
                instance.publishState("postItText", postIt.innerText);
                instance.publishState("postItId", postIt.getAttribute("data-postit-id"));
            });

            document.addEventListener("mouseup", function() {
                if (isDragging) {
                    postIt.style.cursor = "grab";
                    isDragging = false;
                    instance.triggerEvent("postItUpdated");
                }
            });

            postIt.addEventListener("input", function() {
                instance.publishState("postItText", postIt.innerText);
                instance.publishState("postItId", postIt.getAttribute("data-postit-id"));
                instance.triggerEvent("postItUpdated");
            });
        }
    };
}
