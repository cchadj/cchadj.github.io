class ProgressBar {
    /**
     * @param progressBarId {string}
     * @param playPauseButtonId {string}
     */
    constructor(progressBarId, playPauseButtonId) {
        this.progressBar = document.getElementById(progressBarId);
        this.playPauseButton = document.getElementById(playPauseButtonId);
        this.numFrames = 0;
        this.playing = false;

        this.onUpdateCallback = null;
        this.onTogglePlayCallback = null;

        this.progressBar.addEventListener('input', this.onInput.bind(this));
        this.playPauseButton.addEventListener('click', this.togglePlay.bind(this));
    }

    onInput() {
        if (this.onUpdateCallback) {
            this.onUpdateCallback(Math.floor(this.progressBar.value * this.numFrames / 100));
        }
    }

    /**
     * @param numFrames {number}
     */
    setNumFrames(numFrames) {
        this.numFrames = numFrames;
    }

    /**
     * @param callback {(number) => {}}
     */
    setUpdateCallback(callback) {
        this.onUpdateCallback = callback;
    }

    /**
     * @param callback {() => {}}
     */
    setTogglePlayCallback(callback) {
        this.onTogglePlayCallback = callback;
    }

    togglePlay() {
        if (this.onTogglePlayCallback) {
            this.onTogglePlayCallback();
        }
        this.playPauseButton.textContent = this.playing ? 'Pause' : 'Play';
    }

    updateProgressBar(frame) {
        this.progressBar.value = (frame / this.numFrames) * 100;
    }
}