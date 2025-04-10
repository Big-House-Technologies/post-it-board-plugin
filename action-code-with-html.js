function(properties, context) {
    const canvasID = properties.canvasID;
    const existingPostIts = Array.isArray(properties.existingPostItObjects)
        ? properties.existingPostItObjects
        : [];

    if (!canvasID) {
        console.warn("⚠️ [Action] No canvas ID provided.");
        return;
    }

    if (typeof window.renderExistingPostIts !== "function") {
        console.warn("⚠️ [Action] Global renderExistingPostIts function is missing.");
        return;
    }

    // instance comes from context in this case
    const instance = context.element;

    window.renderExistingPostIts(canvasID, existingPostIts, properties, instance);
}
