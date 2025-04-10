function(instance, properties, context) {
    console.log("🔄 Running Post-It Board update");

    const canvasID = properties.canvasID;
    if (!canvasID) {
        console.warn("⚠️ No canvas ID provided.");
        return;
    }

    const existingPostIts = Array.isArray(properties.existingPostItObjects)
        ? properties.existingPostItObjects
        : [];

    if (!instance.data.renderExistingPostIts) {
        console.warn("⚠️ Missing renderExistingPostIts function.");
        return;
    }

    instance.data.renderExistingPostIts(canvasID, existingPostIts, properties, instance);
}
