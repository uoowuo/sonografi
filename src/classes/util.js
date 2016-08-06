const THREE = require('three');
const STLLoader = require('three-stl-loader')(THREE);

/**
 * Contains utility functions.
 */
class Util {

    /**
     * Attempts to load a file and calls a function, depending on outcome.
     *
     * @param  {Object}    file             File object to load, format as per drag&drop event dropEvent.dataTransfer.files[0]
     * @param  {Function}  successCallback  Function to call with file contents parameter, if successful
     * @param  {Function}  errorCallback    Function to call with error event parameter, if file loading failed
     */
    static loadFile (file, successCallback, errorCallback) {

        // Get file info
        const fileName = file.name;
        const fileReader = new FileReader();

        // Handle file loaded and file load error events
        fileReader.addEventListener('load', function (loadEvent) {
            const fileContents = loadEvent.target.result;
            successCallback(fileContents);
        });
        fileReader.addEventListener('error', function (errorEvent) {
            errorCallback(errorEvent);
        });

        // Start the actual loading
        fileReader.readAsArrayBuffer(file);
    }


    /**
     * Loads an external STL model into the scene.
     * @todo make default shader values
     * @todo add loading progress
     * @param    {String}   path               Path to model file
     * @param    {Number}   scale=1            Relative model scale
     * @param    {String}   vertexShader       Code for the vertex shader
     * @param    {String}   pixelShader        Code for the pixel shader
     * @param    {Object}   uniforms           Additional Three.js uniforms to use
     * @param    {Number}   side=0             Face sides to render, integer 0..2, see Three.js docs on BackSide etc.
     * @param    {Boolean}  transparent=false  Whether the object uses transparency
     * @returns  {Promise}                     Promise for model loaded event
     */
    static loadModel (path, scale = 1, vertexShader, pixelShader, uniforms, side = 0, transparent = false) {

        // Merge with default uniforms
        uniforms = Object.assign({}, {
            origin:  {type: 'v3', value: new THREE.Vector3(0, 0, 0)} // @todo implement actual live origin coords
        }, uniforms);

        // Setup and execute STL format loader with a promise
        const stlLoader = new STLLoader();
        return new Promise(function (resolve, reject) {
            stlLoader.load(path,

                // On data loaded, create a mesh with given geometry and shaders, and return
                function (geometry) {
                    const material = new THREE.ShaderMaterial({
                        uniforms: uniforms,
                        vertexShader: vertexShader,
                        fragmentShader: pixelShader,
                        side: side,
                        transparent: transparent
                    });
                    // Fix separated faces somehow due to unpopulated .geometry.faces[i].vertexNormals arrays
                    const fixedGeometry = new THREE.Geometry().fromBufferGeometry(geometry);
                    fixedGeometry.mergeVertices();  // It is a mystery why they get separated in the first place
                    fixedGeometry.computeFaceNormals();
                    fixedGeometry.computeVertexNormals();
                    const model = new THREE.Mesh(fixedGeometry, material);
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
     * Generates a texture on offscreen canvas with a given generator function.
     *
     * @param    {Function}  generator  Generator function to make the texture with. Drawing context and texture size passed
     * @returns  {THREE.Texture}        Generated Three.js texture object
     */
    static generateTexture (generator) {

        // Prepare offscreen canvas to draw on
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.style = "position:fixed; bottom: 0; opacity: 0;";  // @todo remove this
        document.body.appendChild(canvas);                        // @todo remove this

        // Select a power-of-two texture size nearest to the screen dimensions
        const screenSide = Math.min(document.body.clientWidth, document.body.clientHeight);
        for (let textureSizes = [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384], i = 0; i < textureSizes.length; i++) {
            if (screenSide <= textureSizes[i]) {
                var textureSize = textureSizes[i];
                break;
            }
        }
        canvas.width = canvas.height = textureSize;

        // Generate and return the texture
        generator(context, textureSize);
        const texture = new THREE.Texture(canvas);
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
     * @param    {Object}   uniforms           Additional Three.js uniforms to use
     * @param    {Number}   side=0             Face sides to render, integer 0..2, see Three.js docs on BackSide etc.
     * @param    {Boolean}  transparent=false  Whether the object uses transparency
     * @returns  {THREE.Mesh}                  Generated Three.js object mesh
     */
    static makeSphere (radius = 1, detail = 1, vertexShader, pixelShader, uniforms, side = 0, transparent = false) {

        // Create geometry, apply shaders and return result
        const geometry = new THREE.IcosahedronGeometry(radius, detail);
        uniforms = Object.assign({}, {
            origin:  {type: 'v3', value: new THREE.Vector3(0, 0, 0)} // @todo implement actual live origin coords
        }, uniforms);
        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: pixelShader,
            side: side,
            transparent: transparent
        });
        return new THREE.Mesh(geometry, material);
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
            Util.drawStar(
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
     * @todo normal distribution
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
        const fieldWidth = context.canvas.clientWidth;
        const fieldHeight = context.canvas.clientHeight;
        for (let starIndex = 0; starIndex < starCount; starIndex++) {
            Util.drawShadedStar(
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

export default Util;