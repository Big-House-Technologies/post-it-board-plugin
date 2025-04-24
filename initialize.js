function(instance, context) {

    if (!instance.data) instance.data = {};

    instance.data.postItX = 0;
    instance.data.postItY = 0;
    instance.data.postItText = "";
    instance.data.postItID = "";
    instance.data.eventAttached = false;
    instance.data.has_initalized = false;

}