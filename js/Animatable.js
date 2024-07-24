class Animatable {
    /**
     * @returns {number}
     */
    getNumFrames() {
        throw new Error("Method 'getNumFrame()' must be implemented.");
    }

    /**
     * @param frame {number}
     */
    gotoFrame(frame) {
        throw new Error("Method 'gotoFrame()' must be implemented.");
    }

    /**
     * @param deltaTime {number}
     */
    update(deltaTime) {}

    reset() {}
}