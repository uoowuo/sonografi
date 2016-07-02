import Viewport from './viewport';
import Shaders from './shaders';
import Sound from './sound';
import Util from './util';

// @todo make vars local?
var THREE = require('three');
var OrbitControls = require('three-orbit-controls')(THREE);
var ColladaLoader = require('three-loaders-collada')(THREE);

/**
 * Represents the overall visualizer setup.
 * @todo hide mouse cursor
 * @todo favicon
 * @todo reduce earth.dae size
 *
 * @requires  viewport
 * @requires  shaders
 * @requires  sound
 * @requires  util
 */
class Sonografi {

    /**
     * Creates a new audio visualizer instance.
     *
     * @param  {HTMLElement}  canvas  Canvas DOM element to render to
     */
    constructor (canvas) {

        // Init viewport and sound
        // window.three = THREE; @todo wtf is this for
        var closureThis = this;
        this.viewport = new Viewport(canvas, 0x000000, 1);  // Background color, opacity
        this.sound = new Sound();

        // Generate textures
        var starFieldTexture = Sonografi.generateTexture(function (context, textureSize) {

            // Make colored stars on black background
            var screenSide = Math.min(document.body.clientWidth, document.body.clientHeight);
            context.fillStyle = 'black';
            context.fillRect(0, 0, context.canvas.width, context.canvas.height);
            Sonografi.drawStarField(context, 960, screenSide / 512, screenSide / 512, 0, 360, 30, 60);
        });

        // Setup shaders
        // @todo extract a shared part
        this.shaderUniforms = {
            time:             this.viewport.timeUniform,
            amplitude:        this.sound.amplitudeUniform,
            starFieldTexture: {type: 't', value: starFieldTexture},
            screenHeight:     {type: 'f', value: document.body.clientHeight},
            earthOrigin:      {type: 'v3', value: new THREE.Vector3(0.0, 0.0, 0.0)}
        };

        // Setup shared shader uniforms
        this.sharedUniforms = {
            time:             this.viewport.timeUniform,
            amplitude:        this.sound.amplitudeUniform,
            starFieldTexture: {type: 't', value: starFieldTexture},
            screenHeight:     {type: 'f', value: document.body.clientHeight}
        };

        // Setup scene
        var EarthRotationAxis = new THREE.Vector3(0, 1, 0);
        var rotationAngle = 0.0005;
        this.sky = this.makeSphere(80000, 1, Shaders.vertex.plain, Shaders.pixel.scrollingStars, THREE.BackSide);
        this.ocean = this.makeSphere(1.3, 5, Shaders.vertex.wavy, Shaders.pixel.oceanic, THREE.FrontSide, true);
        this.viewport.scene.add(this.sky, this.ocean);
        this.loadModel('./models/earth.dae', 1.3, Shaders.vertex.extruded, Shaders.pixel.disco, THREE.DoubleSide)
            .then(function (model) {
                closureThis.earth = model;
                closureThis.viewport.scene.add(closureThis.earth);
                closureThis.earth.rotation.x = 0.15;
                closureThis.earth.rotation.y = -0.36;

                // Spin the Earth
                closureThis.viewport.addAnimationFunction(function () {
                    closureThis.ocean.rotateOnAxis(EarthRotationAxis, rotationAngle);
                    closureThis.earth.rotateOnAxis(EarthRotationAxis, rotationAngle);
                }, 'spinEarth');
            });
        this.controls = new OrbitControls(this.viewport.camera);


        // Setup drag & drop. Bind() sound.decode to prevent 'this undefined' error
        document.addEventListener('dragover', Util.allowDragging, false);
        document.addEventListener('drop', function (dropEvent) {

            // Stop all the things
            dropEvent.preventDefault();
            dropEvent.stopPropagation();

            // Attempt to load the file and start decoding
            Util.loadFile(
                dropEvent.dataTransfer.files[0],
                closureThis.sound.decode.bind(closureThis.sound),  // On file load success
                (err) => { console.error(err); }                   // On file load fail
            );
        }, false);
    }

    /**
     * Generates a texture on offscreen canvas with a given generator function.
     *
     * @param    {Function}  generator  Generator function to make the texture with. Drawing context and texture size passed
     * @returns  {THREE.Texture}        Generated Three.js texture object
     */
    static generateTexture (generator) {

        // Prepare offscreen canvas to draw on
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.style = "position:fixed; bottom: 0; opacity: 0;";  // @todo remove this
        document.body.appendChild(canvas);                        // @todo remove this

        // Select a power-of-two texture size nearest to the screen dimensions
        var screenSide = Math.min(document.body.clientWidth, document.body.clientHeight);
        for (let textureSizes = [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384], i = 0; i < textureSizes.length; i++) {
            if (screenSide <= textureSizes[i]) {
                var textureSize = textureSizes[i];
                break;
            }
        }
        canvas.width = canvas.height = textureSize;

        // Generate and return the texture
        generator(context, textureSize);
        var texture = new THREE.Texture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Prepares a sphere object with given parameters.
     * @todo make default shader values
     * @param    {Number}   radius=1           Sphere radius
     * @param    {Number}   detail=1           Level of detail, integer
     * @param    {String}   vertexShader       Code for the vertex shader
     * @param    {String}   pixelShader        Code for the pixel shader
     * @param    {Number}   side=0             Face sides to render, integer 0..2, see Three.js docs on BackSide etc.
     * @param    {Boolean}  transparent=false  Whether the object uses transparency
     * @returns  {THREE.Mesh}                  Generated Three.js object mesh
     */
    makeSphere (radius = 1, detail = 1, vertexShader, pixelShader, side = 0, transparent = false, texture = undefined) {

        // Create geometry, apply shaders and return result
        var geometry = new THREE.IcosahedronGeometry(radius, detail);
        var uniforms = {
            texture: {type: 't', value: texture},
            origin:  {type: 'v3', value: new THREE.Vector3(0, 0, 0)} // @todo change that see next line
            // origin:  {type: 'v3', value: new THREE.Vector3(this.position.x, this.position.y, this.position.z)}
        };
        var material = new THREE.ShaderMaterial({
            uniforms: this.shaderUniforms,
            vertexShader: vertexShader,
            fragmentShader: pixelShader,
            side: side,
            transparent: transparent
        });
        return new THREE.Mesh(geometry, material);
    }

    /**
     * Loads an external Collada model into the scene.
     * @todo make default shader values
     * @param    {String}   path               Path to model file
     * @param    {Number}   scale=1            Relative model scale
     * @param    {String}   vertexShader       Code for the vertex shader
     * @param    {String}   pixelShader        Code for the pixel shader
     * @param    {Number}   side=0             Face sides to render, integer 0..2, see Three.js docs on BackSide etc.
     * @param    {Boolean}  transparent=false  Whether the object uses transparency
     * @returns  {Promise}                     Promise for model loaded event
     */
    loadModel (path, scale = 1, vertexShader, pixelShader, side = 0, transparent = false) {

        // Setup and execute Collada format loader with a promise
        var closureThis = this;
        var colladaLoader = new THREE.ColladaLoader();
        colladaLoader.options.convertUpAxis = true;
        return new Promise(function (resolve, reject) {
            colladaLoader.load(path,

                // On data loaded, extract the model, apply shaders and return
                function (data) {
                    var modelData = data.scene.children[0].children[0];
                    var material = new THREE.ShaderMaterial({
                        uniforms: closureThis.shaderUniforms,
                        vertexShader: vertexShader,
                        fragmentShader: pixelShader,
                        side: side,
                        transparent: transparent
                    });
                    var model = new THREE.Mesh(modelData.geometry, material);
                    model.scale.x = model.scale.y = model.scale.z = scale;
                    resolve(model);
                },

                // On progress, do nothing
                function () {},

                // On loading fail, fail
                function () {
                    reject(new Error('Failed to load model ' + path));
                }
            );
        });
    }

    /**
     * Draws a 4-pointed star on a canvas.
     *
     * @param    {CanvasRenderingContext2D}  context  Canvas context to draw in
     * @param    {Number}                    x        X coordinate of star center
     * @param    {Number}                    y        Y coordinate of star center
     * @param    {Number}                    radius   Star radius
     * @param    {String}                    color    Star color in any form accepted by Canvas 2D API
     * @returns  {CanvasRenderingContext2D}           The drawing context initially passed in
     */
    static drawStar (context, x, y, radius, color) {

        // Draw 4 arcs with star center as the reference point and fill the resulting figure
        context.beginPath();
        context.moveTo(x, y - radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.quadraticCurveTo(x, y, x, y + radius);
        context.quadraticCurveTo(x, y, x - radius, y);
        context.quadraticCurveTo(x, y, x, y - radius);
        context.closePath();
        context.fillStyle = color;
        context.fill();
        return context;
    }

    /**
     * Draws a shaded 4-pointed star on a canvas.
     *
     * @param    {CanvasRenderingContext2D}  context     Canvas context to draw in
     * @param    {Number}                    x           X coordinate of star center
     * @param    {Number}                    y           Y coordinate of star center
     * @param    {Number}                    radius      Star radius
     * @param    {Number}                    hue         Color hue, integer 0..360
     * @param    {Number}                    saturation  Color saturation, integer 0..100
     * @param    {Number}                    lightness   Color lightness, integer 0..100
     * @param    {Number}                    shadeCount  Number of drawing steps
     * @returns  {CanvasRenderingContext2D}              The drawing context initially passed in
     */
    static drawShadedStar (context, x, y, radius, hue, saturation, lightness, shadeCount) {

        // Draw shadeCount stars of decreasing radius, from transparent to opaque
        for (let shadeIndex = shadeCount; shadeIndex > 0; shadeIndex--) {
            Sonografi.drawStar(
                context,                  // Drawing context
                x,                        // X position
                y,                        // Y position
                shadeIndex / shadeCount * radius,  // Radius
                `hsla(${hue}, ${saturation}%, ${lightness}%, ${(shadeCount - shadeIndex + 1) / shadeCount})`  // Color
            );
        }
        return context;
    }

    /**
     * Fills a canvas with stars.
     *
     * @param    {CanvasRenderingContext2D}  context              Canvas context to draw in
     * @param    {Number}                    starCount            Number of stars to draw
     * @param    {Number}                    radius               Star radius
     * @param    {Number}                    radiusVariation      Maximum absolute deviation from radius 
     * @param    {Number}                    hue                  Color hue, integer 0..360
     * @param    {Number}                    hueVariation         Maximum absolute deviation from hue
     * @param    {Number}                    saturation           Color saturation, integer 0..100
     * @param    {Number}                    saturationVariation  Maximum absolute deviation from saturation
     * @returns  {CanvasRenderingContext2D}                       The drawing context initially passed in
     */
    static drawStarField (context, starCount, radius, radiusVariation, hue, hueVariation, saturation, saturationVariation) {

        // Draw shaded stars one by one, applying random variation in hue, saturation and radius
        var fieldWidth = context.canvas.clientWidth;
        var fieldHeight = context.canvas.clientHeight;
        for (let starIndex = 0; starIndex < starCount; starIndex++) {
            Sonografi.drawShadedStar(
                context,                                                       // Drawing context
                Math.random() * fieldWidth,                                    // X position
                Math.random() * fieldHeight,                                   // Y position
                radius + (Math.random() - 0.5) * radiusVariation * 2,          // Radius
                hue + (Math.random() - 0.5) * hueVariation * 2,                // Hue
                saturation + (Math.random() - 0.5) * saturationVariation * 2,  // Saturation
                50 + (Math.random() - 0.5) * 100,                              // Lightness
                3                                                              // Shades per star
            );
        }
        return context;
    }
}

export default Sonografi;