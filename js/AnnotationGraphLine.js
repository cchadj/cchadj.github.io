
class AnnotationGraphLine extends Animatable {
    /**
     * @param canvas {HTMLCanvasElement}
     * @param motionObj {{}}
     * @param strokeStyle {string}
     * @param lineWidth {number}
     */
    constructor(
        canvas,
        motionObj,
        strokeStyle= "#4CAF50",
        lineWidth = 2,
    ) {
        super();
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
        this.strokeStyle = strokeStyle;
        this.lineWidth = lineWidth;
        this.motionObj = motionObj;
        this.featureKey = Object.keys(this.motionObj)[0];
    }

    /**
     * @param featureKey {string}
     */
    setFeatureKey(featureKey) {
        this.featureKey = featureKey;
    }

    /**
     * @param maxFrame {number | null}
     */
    drawGraph(maxFrame = null) {
        const width = this.canvas.width;
        const height = this.canvas.height;

        const min = 0;
        const max = 1;
        const range = max - min;
        const ctx = this.ctx

        ctx.beginPath();
        ctx.strokeStyle = this.strokeStyle
        ctx.lineWidth = this.lineWidth

        maxFrame = maxFrame?? (this.getData().length - 1)
        this.getData().forEach((value, index) => {
            const x = (index / maxFrame) * width;
            const y = height - ((value - min) / range) * height;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        // Add y-axis labels
        ctx.font = '18px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        // Label for maximum value (1)
        ctx.fillText('1', 14, 10);

        // Label for minimum value (0)
        ctx.fillText('0', 14, height - 10);

        ctx.stroke();
    }

    /**
     * @returns {number[]}
     */
    getData() {
        return this.motionObj[this.featureKey]
    }

    getNumFrames() {
        return this.getData().length
    }

    gotoFrame(frame) {
    }

}
