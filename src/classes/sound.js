/**
 * Represents the audio processing setup
 * 
 * @todo clean up && organize
 */
class Sound {

    /**
     * Setup audio processing
     * @todo ScriptProcessorNode is deprecated, replace it and ensure other functions are okay
     */
    constructor () {

        /**
         * Current sound amplitude.
         * @type  {Number}
         * @public
         * @readonly
         */
        this.amplitudeUniform = {type: 'f', value: 0};  // Shader uniform object usable by Three.js, to achieve pass-by-reference

        // Setup analysis
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.startAnalysis(this.audioContext, 256);
        // this.sourceBuffer = this.audioContext.createBufferSource();

        // Wire up source -> analyser -> destination
        this.sourceElement = document.querySelector('audio#playlist');
        this.sourceBuffer = this.audioContext.createMediaElementSource(this.sourceElement);
        this.sourceBuffer.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        // @todo make from mic too
        this.sourceElement.play();
    }

    /**
     * Analyzes audio stream on the given AudioContext
     * @todo writeme
     * @param  {Number}  fftSize  Fast Fourier Transform size = analysis resolution; must be power of 2 and twice the number of samples
     *
     * @returns  {AnalyserNode}  AnalyserNode object analysis is done on
     */
    startAnalysis (audioContext, fftSize) {

        // Setup analyser node
        var analyser = audioContext.createAnalyser();
        analyser.fftSize = fftSize;

        // Start analysis loop and return
        var closureThis = this;
        var audioFrameBuffer = new Uint8Array(analyser.frequencyBinCount);
        var analysisLoop = function() {
            requestAnimationFrame(analysisLoop);
            analyser.getByteFrequencyData(audioFrameBuffer);
            closureThis.amplitudeUniform.value = (audioFrameBuffer[3] + audioFrameBuffer[30] + audioFrameBuffer[100]) / (3 * 19);
        };
        analysisLoop();
        return analyser;
    }

    /**
     * Decodes audio buffer
     * @todo writeme && write meaningful error handling
     * 
     * @param  buffer
     */
    decode (buffer) {

        var closureThis = this;
        this.audioContext.decodeAudioData(buffer,
            function (decodedBuffer) {
                closureThis.sourceBuffer.buffer = decodedBuffer;
                closureThis.sourceBuffer.start(0);
            },
            function () {
                throw new Error('Audio decoding failed');
            }
        );
    }
}

export default Sound;