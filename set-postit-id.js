function(properties, context) {
    console.log("✅ Setting Post-It ID...");

    // Retrieve the Post-It ID from the properties
    const postItID = properties.postItID;
    console.log("🔹 Post-It ID:", postItID);

    if (!postItID) {
        console.warn("⚠️ No Post-It ID provided.");
        return;
    }

    // ✅ Return the Post-It ID so it can be used in the workflow
    return {
        postItId: postItID
    };
}
