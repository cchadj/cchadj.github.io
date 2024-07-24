class AnnotationGraph extends Animatable {
    /**
     * @param canvas {HTMLCanvasElement}
     * @param annotationGraphs {Object.<string, AnnotationGraphLine>}
     */
    constructor(
        canvas,
        annotationGraphs = {},
    ) {
        super();
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
        this.lines = annotationGraphs;
        this._graphFrames = 0
    }

    get graphFrames() {
        return this._graphFrames;
    }

    set graphFrames(value) {
        this._graphFrames = value;
    }

    clearGraphLines() {
        this.lines = []
    }

    /**
     * @param id {string}
     * @param annotationGraphLine {AnnotationGraphLine}
     */
    addGraphLine(id, annotationGraphLine) {
        if (annotationGraphLine.getNumFrames() > this.graphFrames) {
            this.graphFrames = annotationGraphLine.getNumFrames();
        }
        this.lines[id] = annotationGraphLine
    }

    clearGraph() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.ctx.clearRect(0, 0, width, height);
    }

    drawGraph() {
        Object.values(this.lines).forEach(g => { g.maxFrame = this.graphFrames })
        Object.values(this.lines).forEach(g => g.drawGraph());
    }

    getNumFrames() {
        const largestAnnotationLine = Object.values(this.lines).reduce(
            (acc, current) => {
            return current.getNumFrames() > acc.getNumFrames() ? current : acc;
        }, Object.values(this.lines)[0]);
        return largestAnnotationLine?.getNumFrames() || 0 ;
    }

    gotoFrame(frame) {
        this.clearGraph()
        this.drawGraph()
        Object.values(this.lines).forEach(g => { g.maxFrame = this.graphFrames })
        Object.values(this.lines).forEach(g => g.gotoFrame(frame))
    }

    reset() {
        this.clearGraph()
        this.drawGraph()
    }

}
