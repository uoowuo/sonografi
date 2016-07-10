/**
 * Represents the audio processing setup
 * 
 * @todo clean up && organize
 */
class Sound {

    /**
     * Sets up audio processing.
     * @todo ScriptProcessorNode is deprecated, replace it and ensure other functions are okay
     * @todo y u no work on FF/Android
     */
    constructor () {

        var closureThis = this;
        this.amplitudeUniform = {type: 'f', value: 0};      // Sound amplitude digest value in Three.js shader uniform format
        this.amplitudesUniform = {type: 'fv', value: []};   // Sound amplitudes array in Three.js shader uniform format
        this.frequencyUniform = {type: 'f', value: 0};      // Sound frequency digest in Three.js shader uniform format
        this.frequenciesUniform = {type: 'fv', value: []};  // Sound frequencies array in Three.js shader uniform format
        this.streakUniform = {type: 'f', value: 0};         // Softly rising and falling streak indicator

        // Setup analysis
        const fftSize = 256;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.startAnalysis(this.audioContext, fftSize);
        // this.sourceBuffer = this.audioContext.createBufferSource();

        // Wire up source -> analyser -> destination
        this.sourceElement = document.querySelector('audio#playlist');
        this.sourceBuffer = this.audioContext.createMediaElementSource(this.sourceElement);
        this.sourceBuffer.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        // @todo make from mic too
        this.sourceElement.play();

        // Run streak detector
        // @todo better detect based on time sequence analysis or at least determine a baselevel for the song at the start, for threshold
        // @todo OOP this
        var streakStack = 0;
        const detectionThreshold = 196;  // When to add excess amplitude to streakStack
        const streakThreshold = 128;     // When to start a streak
        const streakReserve = 302;       // Streak stability to fluctuations
        const streakGain = 32;           // How fast a streak comes when amplitude increases
        this.streakActive = false;
        this.streakHandle = setInterval(function() {

            // Add up to detection
            if (closureThis.amplitudeUniform.value > detectionThreshold) {
                streakStack = (streakStack < streakReserve) ? streakStack + (closureThis.amplitudeUniform.value - detectionThreshold) * streakGain : streakStack;
            } else {
                streakStack = (streakStack > 0) ? streakStack - (detectionThreshold - closureThis.amplitudeUniform.value) : streakStack;
            }

            // Detect and start a streak or stop a running streak
            if (streakStack > streakThreshold) {
                closureThis.streakActive = true;   // Start the streak
                streakStack = streakReserve;       // And make sure it doesn't immediately fade
            } else {
                closureThis.streakActive = false;  // Stop the streak
            }
        }, 133);
    }

    /**
     * Analyzes audio stream on the given AudioContext.
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
        var audioFrameTimeBuffer = new Uint8Array(analyser.fftSize / 2);
        var audioFrameFreqBuffer = new Uint8Array(analyser.frequencyBinCount);
        const sum = (a, b) => { return a + b };
        var analysisLoop = function() {
            requestAnimationFrame(analysisLoop);

            // Put data where data belongs
            analyser.getByteTimeDomainData(audioFrameTimeBuffer);
            analyser.getByteFrequencyData(audioFrameFreqBuffer);
            closureThis.amplitudeUniform.value = audioFrameTimeBuffer.reduce(sum) / (analyser.fftSize / 2);
            closureThis.amplitudesUniform.value = audioFrameTimeBuffer;
            closureThis.frequencyUniform.value = audioFrameFreqBuffer.reduce(sum) / (analyser.fftSize / 2);        // Maybe slice here too
            closureThis.frequenciesUniform.value = audioFrameFreqBuffer.slice(Math.floor(analyser.fftSize / 64));  // Because aliasing at high frequencies

            // Ramp streak up or down
            if (closureThis.streakActive === true) {
                closureThis.streakUniform.value = (closureThis.streakUniform.value < 127) ? closureThis.streakUniform.value + 1 : closureThis.streakUniform.value;
            } else {
                closureThis.streakUniform.value = (closureThis.streakUniform.value > 0) ? closureThis.streakUniform.value - 1 : closureThis.streakUniform.value;
            }
        };
        analysisLoop();
        return analyser;
    }

    /**
     * Decodes audio buffer.
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