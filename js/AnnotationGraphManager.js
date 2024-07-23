class AnnotationGraphManager extends Animatable {
    /**
     * @param canvas {HTMLCanvasElement}
     * @param annotationGraphs {AnnotationGraphLine[]}
     */
    constructor(
        canvas,
        annotationGraphs = [],
    ) {
        super();
        this.canvas = canvas;
        console.log(canvas)
        this.ctx = this.canvas.getContext("2d");
        this.lines = annotationGraphs;
    }

    clearGraphLines() {
        this.lines = []
    }

    /**
     * @param annotationGraphLine {AnnotationGraphLine}
     */
    addGraphLine(annotationGraphLine) {
       this.lines.push(annotationGraphLine)
    }

    clearGraph() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.ctx.clearRect(0, 0, width, height);
    }

    drawGraph() {
        const maxFrames = this.getNumFrames()
        this.lines.forEach(g => g.drawGraph(maxFrames));
    }

    getNumFrames() {
        const largestAnnotationLine = this.lines.reduce(
            (acc, current) => {
            return current.getNumFrames() > acc.getNumFrames() ? current : acc;
        }, this.lines[0]);
        return largestAnnotationLine?.getNumFrames() || 0 ;
    }

    gotoFrame(frame) {
        this.lines.forEach(g => g.gotoFrame(frame))
    }

}
