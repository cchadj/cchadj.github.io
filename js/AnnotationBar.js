
class AnnotationBar extends Animatable {
    /**
     * @param motionData {Object.<string, number[]>}
     * @param featureBar {FeatureBar}
     * @param valueDisplay {ValueDisplay}
     * @param featureKey {string | null}
     * @param color {string}
     */
    constructor(
        motionData,
        featureBar,
        valueDisplay,
        featureKey = null,
        color = "#4fff00"
    ) {
        super();
        this.color = color;
        this.featureBar = featureBar;
        this.valueDisplay = valueDisplay;
        this.motionData = motionData;
        this.frame = 0;
        this.featureKey = featureKey?? "BODY";
    }

    /**
     * @param featureKey {string}
     */
    setFeatureKey(featureKey) {
        this.featureKey = featureKey;
    }

    get data() {
        return this.getData()
    }

    getData() {
        return this.motionData[this.featureKey]
    }

    getNumFrames() {
        return this.data.length
    }

    gotoFrame(frame) {
        this.frame = frame >= this.getNumFrames()
            ? this.getNumFrames() - 1
            : frame;
        this.updateFeatureBar()
    }

    updateFeatureBar() {
        if (!this.featureKey || !this.data)
            return;

        const frame_idx = this.frame < this.getNumFrames()
            ? this.frame
            : this.getNumFrames() - 1

        const value =  this.data[frame_idx]
        const height = value * 100;

        if (this.featureBar.isValid)
        {
            this.featureBar.value = height;
        }

        if (this.valueDisplay.isValid) {
            this.valueDisplay.text = value.toFixed(2);
        }
    }

    reset() {}

}
