/**
 * Contains utility functions.
 */
class Util {

    /**
     * Decodes URI parameters
     *
     * @returns  {Object}  An Object containing parsed URI parameters
     */
    static getParams () {
        return decodeURIComponent(window.location.search.slice(1))
            .split('&')
            .reduce(function (objectAccum, current) {
                current = current.split('=');
                objectAccum[current[0]] = current[1];
                return objectAccum;
            }, {});
    }

    /**
     * Resizes canvas to its real client size.
     * @todo make it recenter camera as well, perhaps call a Viewport resize method if there is a Viewport
     * @todo REMOVE ME is unused
     *
     * @param    {HTMLElement}  canvas  Reference to a canvas DOM element
     * @returns  {HTMLElement}          Reference to the same canvas element
     */
    static refitCanvas (canvas) {
        
        // Refit the canvas
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        
        return canvas;
    }
    
    /**
     * Prevents browser from playing/downloading the dragged file and allows JS handling
     * 
     * @param  {Event}  dragoverEvent  Dragover event object
     */
    static allowDragging (dragoverEvent) {

        // Stop playing/downloading and bubbling, allow JS handling 
        dragoverEvent.preventDefault();
        dragoverEvent.stopPropagation();
        dragoverEvent.dataTransfer.dropEffect = 'copy';
    }

    /**
     * Attempts to load a file and calls a function, depending on outcome.
     *
     * @param  {Object}    file             File object to load, format as per drag&drop event dropEvent.dataTransfer.files[0]
     * @param  {Function}  successCallback  Function to call with file contents parameter, if successful
     * @param  {Function}  errorCallback    Function to call with error event parameter, if file loading failed
     */
    static loadFile (file, successCallback, errorCallback) {

        // Get file info
        var fileName = file.name;
        var fileReader = new FileReader();

        // Handle file loaded and file load error events
        fileReader.addEventListener('load', function (loadEvent) {
            var fileContents = loadEvent.target.result;
            successCallback(fileContents);
        });
        fileReader.addEventListener('error', function (errorEvent) {
            errorCallback(errorEvent);
        });

        // Start the actual loading
        fileReader.readAsArrayBuffer(file);
    }
}

export default Util;