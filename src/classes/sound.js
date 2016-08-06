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

        const this1 = this;
        this.amplitudeUniform = {type: 'f', value: 0};      // Sound amplitude digest value in Three.js shader uniform format
        this.amplitudesUniform = {type: 'fv', value: new Float32Array(32)};   // Sound amplitudes array in Three.js shader uniform format
        this.frequencyUniform = {type: 'f', value: 0};      // Sound frequency digest in Three.js shader uniform format
        this.frequenciesUniform = {type: 'fv', value: new Float32Array(32)};  // Sound frequencies array in Three.js shader uniform format
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
        // @todo OOP this maybe
        // @todo it's crap, see linear regression etc.
        let streakStack = 0;
        const detectionThreshold = 128;  // When to add excess amplitude to streakStack
        const streakThreshold = 860;     // When to start a streak
        const streakReserve = 3000;      // Streak stability to fluctuations
        const streakGain = 1;            // How fast a streak comes when amplitude increases
        this.streakActive = false;
        this.streakWasActive = false;
        this.streakHandle = setInterval(function() {

            // Add up to detection
            if (this1.amplitudeUniform.value > detectionThreshold) {
                streakStack = (streakStack < streakReserve) ? streakStack + (this1.amplitudeUniform.value - detectionThreshold) * streakGain : streakStack;
            } else {
                streakStack = (streakStack > 0) ? streakStack - (detectionThreshold - this1.amplitudeUniform.value) : streakStack;
            }

            // Detect and start a streak or stop a running streak
            this1.streakWasActive = this1.streakActive;
            if (streakStack > streakThreshold) {
                this1.streakActive = true;    // Start the streak
                streakStack = (! this1.streakWasActive) ? streakReserve : streakStack;  // And make sure it doesn't immediately fade
            } else {
                this1.streakActive = false;  // Stop the streak
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
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = fftSize;

        // Start analysis loop and return
        const this1 = this;
        const useBins = 32;
        const audioFrameTimeBuffer = new Uint8Array(analyser.fftSize / 2);
        const audioFrameFreqBuffer = new Uint8Array(analyser.frequencyBinCount);
        const sum = (a, b) => { return a + b };
        const analysisLoop = function() {
            requestAnimationFrame(analysisLoop);

            // Put data where data belongs
            analyser.getByteTimeDomainData(audioFrameTimeBuffer);
            analyser.getByteFrequencyData(audioFrameFreqBuffer);
            this1.amplitudeUniform.value = audioFrameTimeBuffer.reduce(sum) / (analyser.fftSize / 2);
            this1.amplitudesUniform.value.set(audioFrameTimeBuffer.slice(0, useBins));
            this1.frequencyUniform.value = audioFrameFreqBuffer.reduce(sum) / (analyser.fftSize / 2);        // Maybe slice here too
            const cutOffFreqBins = Math.floor(analyser.fftSize / 64);  // Because aliasing at high frequencies
            this1.frequenciesUniform.value.set(audioFrameFreqBuffer.slice(cutOffFreqBins, cutOffFreqBins + useBins));

            // Ramp streak up or down
            if (this1.streakActive === true) {
                this1.streakUniform.value = (this1.streakUniform.value < 127) ? this1.streakUniform.value + 1 : this1.streakUniform.value;
            } else {
                this1.streakUniform.value = (this1.streakUniform.value > 0) ? this1.streakUniform.value - 1 : this1.streakUniform.value;
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

        const this1 = this;
        this.audioContext.decodeAudioData(buffer,
            function (decodedBuffer) {
                this1.sourceBuffer.buffer = decodedBuffer;
                this1.sourceBuffer.start(0);
            },
            function () {
                throw new Error('Audio decoding failed');
            }
        );
    }
}

export default Sound;