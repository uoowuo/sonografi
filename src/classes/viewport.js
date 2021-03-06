const THREE = require('three');
const OrbitControls = require('three-orbit-controls')(THREE);

/**
 * Represents a combination of canvas and Three.js scene, camera and renderer objects.
 * @todo resizing at small widths
 * @todo restrict zooming
 * @todo hide mouse cursor
 * @todo make adjustments on resize see http://raathigesh.com/Audio-Visualization-with-Web-Audio-and-ThreeJS/
 * 
 * @requires  THREE
 */
class Viewport {

    /**
     * Creates a viewport object in a given canvas.
     * Functions defined in the constructor have local/private variable access.
     *
     * @param  {HTMLElement}    canvas     Canvas DOM element to attach to
     * @param  {Number|String}  color      Background color in a format accepted by Three.js renderer
     * @param  {Number|String}  opacity=1  Background opacity, 0..1
     */
    constructor (canvas, color, opacity = 1) {

        /**
         * Rendering function bound looping through requestAnimationFrame.
         * @type  {Function}
         * @private
         */
        this._render = function () {};

        /**
         * A list of functions to execute before each render.
         * @type  {Object}
         * @private
         */
        this._animationList = {};

        // Init viewport
        this.timeUniform = {type: 'f', value: 0};  // Shader uniform object usable by Three.js, to achieve pass-by-reference
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100000);
        this.renderer = new THREE.WebGLRenderer({canvas: canvas, alpha: true});
        this.renderer.setClearColor(color, opacity);
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, true);  // True = autoresize on
        this.camera.position.z = 3.8;
        this.controls = new OrbitControls(this.camera);

        // Start viewport animation loop
        this.startAnimationLoop();
    }

    /**
     * Starts animation loop for Viewport instance.
     */
    startAnimationLoop () {

        // Cache properties
        const renderer = this.renderer;
        const scene = this.scene;
        const camera = this.camera;

        // Rendering function
        // @todo I am performance critical, optimize me if needed
        const this1 = this;
        this._render = function () {

            // Queue for next frame
            requestAnimationFrame(this1._render);

            // Execute queued functions, iterating over an Object of Arrays (of functions),
            // with some variable caching
            const keys = Object.keys(this1._animationList);
            for (let n = 0, l = keys.length; n < l; n++) {
                for (let N = 0, L = this1._animationList[keys[n]].length; N < L; N++) {
                    this1._animationList[keys[n]][N]();
                }
            }

            // Render
            renderer.render(scene, camera);

            // Advance time
            this1.timeUniform.value += 0.01;
        };

        // Start rendering
        this._render();
    };

    /**
     * Stops animation loop for Viewport instance.
     * 2 more loop rounds are performed before actually stopping, due to design.
     */
    stopAnimationLoop () {

        this._render = function () {};
    };

    /**
     * Adds a function with associated key to the pre-render animation list.
     * Multiple functions may be added with the same key.
     *
     * @param    {Function}  func  Function to add
     * @param    {String}    key   Associated key to store function with for later access
     * @returns  {Object}          List of currently active pre-render functions
     */
    addAnimationFunction (func, key) {

        // Create list for key if nonexistent
        if (typeof this._animationList[key] === 'undefined') {
            this._animationList[key] = [];
        }

        // Add function to execution list
        this._animationList[key].push(func);

        return this._animationList;
    };

    /**
     * Removes a function or functions associated with a key
     * from the pre-render animation list.
     *
     * @param    {String}  key  Key to look up functions by
     * @returns  {Array}        Array of removed functions
     */
    removeAnimationFunctions (key) {

        // If associated functions don't exist, return empty array
        if (typeof this._animationList[key] === 'undefined') { return []; }

        // Delete function array associated with key
        const removedFunctions = this._animationList[key];
        const success = delete this._animationList[key];

        // If delete failed, return empty array
        if (! success) { return []; }

        return removedFunctions;
    };

    /**
     * Adjusts viewport upon resize
     */
    refit () {
        
        // Update renderer and camera settings
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, true);
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
    };
}

export default Viewport;