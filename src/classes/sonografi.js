import Viewport from './viewport';
import Shaders from './shaders';
import Sound from './sound';
import Util from './util';

// @todo make vars local?
const THREE = require('three');

/**
 * Represents the overall visualizer setup.
 * @todo performance profile
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
        const this1 = this;
        this.viewport = new Viewport(canvas, 0x000001, 1);  // Background color, opacity; if bugs in FF, try changing color a tiny bit
        this.sound = new Sound();

          ///////////////
         // Materials //
        ///////////////

        // Generate textures
        const starFieldTexture = Util.generateTexture((context, textureSize) => {

            // Make colored stars on black background
            // @todo nebulas
            // @todo better texture scaling
            const screenSide = Math.min(document.body.clientWidth, document.body.clientHeight);
            context.fillStyle = 'black';
            context.fillRect(0, 0, context.canvas.width, context.canvas.height);
            Util.drawStarField(context, 1800, screenSide / 2048, screenSide / 512, 0, 360, 30, 60);
        });

        // Setup common and shader-specific uniforms
        // @todo update camera position on camera movement
        // @todo ! make the ocean change color to music, because static gradients look like crap
        const commonUniforms = {
            screenHeight:     {type: 'f', value: document.body.clientHeight},      // @todo live update this
            cameraPosition:   {type: 'v3', value: this.viewport.camera.position},  // @todo check if this is updated live

            // Pass-by-reference live input
            time:             this.viewport.timeUniform,
            amplitude:        this.sound.amplitudeUniform,
            amplitudes:       this.sound.amplitudesUniform,
            frequency:        this.sound.frequencyUniform,
            frequencies:      this.sound.frequenciesUniform,
            streak:           this.sound.streakUniform
        };
        const oceanUniforms = Object.assign({}, commonUniforms, {
            gradientColors:   {type: 'v3v', value: [  // See gradientColorCount in Shaders.pixel.oceanic
                new THREE.Color(0x010014),
                new THREE.Color(0x010014),
                new THREE.Color(0x4500c3)
            ]},
            gradientStops:      {type: 'fv', value: [0.0, 0.3, 1.0]}  // @todo fix gradient stops
        });
        const skyUniforms = Object.assign({}, commonUniforms, {
            starFieldTexture: {type: 't', value: starFieldTexture}
        });

          ///////////
         // Scene //
        ///////////

        // Setup scene
        // @todo try fresnel
        // @todo exploded colorful crap in orbit or clouds maybe or just atmosphere
        // @todo what's with the giant Pacific ocean, maybe rotate in another axis as well to bypass it
        const EarthRotationAxis = new THREE.Vector3(0, 1, 0);
        const rotationAngle = 0.0003;
        this.sky = Util.makeSphere(80000, 1, Shaders.vertex.plain, Shaders.pixel.scrollingStars, skyUniforms, THREE.BackSide);
        this.ocean = Util.makeSphere(1.3, 5, Shaders.vertex.wavy, Shaders.pixel.oceanicLegacy, oceanUniforms, THREE.FrontSide, true);
        this.ocean.renderOrder = 2;
        this.viewport.scene.add(this.sky, this.ocean);
        Util.loadModel('./models/earth.stl', 1.3, Shaders.vertex.extruded, Shaders.pixel.disco, commonUniforms, THREE.DoubleSide, true)
            .then(function (model) {

                // Add the Earth
                this1.earth = model;
                this1.earth.renderOrder = 1;
                this1.viewport.scene.add(this1.earth);
                this1.earth.rotation.x = 0.15;
                this1.earth.rotation.y = -0.36;

                // Spin the Earth
                this1.viewport.addAnimationFunction(function () {
                    this1.ocean.rotateOnAxis(EarthRotationAxis, rotationAngle);
                    this1.earth.rotateOnAxis(EarthRotationAxis, rotationAngle);
                }, 'spinEarth');
            });

          ////////////////////
         // User Interface //
        ////////////////////

        // Allow dragging file into the window without playing/downloading it
        document.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'copy';
        }, false);

        // Setup drag & drop. Bind() sound.decode to prevent 'this undefined' error
        document.addEventListener('drop', function (event) {

            // Stop all the things
            event.preventDefault();
            event.stopPropagation();

            // Attempt to load the file and start decoding
            Util.loadFile(
                event.dataTransfer.files[0],
                this1.sound.decode.bind(this1.sound),  // On success
                (err) => { console.error(err); }                   // On fail
            );
        }, false);
    }
}

export default Sonografi;