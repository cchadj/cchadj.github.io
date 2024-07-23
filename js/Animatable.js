class Animatable {
    /**
     * @returns {number}
     */
    getNumFrames() {
        throw new Error("Method 'getNumFrame()' must be implemented.");
    }

    /**
     * @param frame {number}
     * @returns {void}
     */
    gotoFrame(frame) {
        throw new Error("Method 'gotoFrame()' must be implemented.");
    }
}