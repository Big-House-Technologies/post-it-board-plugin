function(instance, context) {
    console.log("✅ Initializing Post-It Board...");

    if (!instance.data) instance.data = {};

    instance.data.postItX = 0;
    instance.data.postItY = 0;
    instance.data.postItText = "";
    instance.data.postItID = "";

    console.log("🔹 Post-It Board initialized with instance data:", instance.data);
}
