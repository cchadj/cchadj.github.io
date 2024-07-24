

(function($, window, document) {

    $(function() {
        const bvhReaders = [];
        var vsize = { x:100, y:100, z:0 };
        var mouse = { x:0, y:0 };
        var lightPos, camPos;

        var inRender = true, inResize = false, isNeedPause = false;
        var FAR = 2000;

        var ToRad = Math.PI / 180;
        var ToDeg = 180 / Math.PI;

        var camera, container, scene, renderer, composer, renderPass, delta, center, centerLight;
        var ambient, hemiLight, pointLight, light;
        var body, suit, bodyNeck, bodyHead, head, neck, hair, eyeR, eyeL, teethUp, teethDown, eyeTop, tongue, troat, headBase, fakeNeck, eyesTarget;

        var materials = [];
        var clock = new THREE.Clock();
        var ground;

        var gui;
        var animConfig = {
            current:"none",
            //neckmove:false,
            idle:false,
            walk:true,
            salut:false,
            speed:0.8
        }

        var viewConfig = {
            squeleton:false,
            antialias:false,
            withEffect:false,
            withNormal:false,
            withBump:true
        };

        var sky;
        var skyCube;

        var debug;

        var bvhReader = null;

        var displayModel = true;
        var squeleton;
        var bonesReference = [];


        var SeaStandard = false;
        var BonesRevers = true;

        function init() {

            out1 = document.getElementById("output1");
            out2 = document.getElementById("output2");

            vsize.x = window.innerWidth;
            vsize.y = window.innerHeight;
            vsize.z = vsize.x / vsize.y;

            camPos = { horizontal: 90, vertical: 80, distance: 200, automove: false };
            lightPos = { horizontal: 135, vertical: 35, distance: 200 };
            mouse = { ox:0, oy:0, h:0, v:0, mx:0, my:0, down:false, over:false, moving:true, dx:0, dy:0 };

            if(SeaStandard)lightPos.horizontal+=180;

            debug = document.getElementById("debug");

            // document.getElementById('bvh-file').addEventListener('change', handleBvhFileSelect, false);
            // document.getElementById('annotation-file').addEventListener('change', handleAnnotationFileSelect, false);

            addGUI();

            initScene3D();
        }

        function debugTell(s) {
            debug.innerHTML = s;
        }

        function initScene3D() {

            // RENDERER
            renderer = new THREE.WebGLRenderer({  antialias: false });
            renderer.setSize( vsize.x, vsize.y );
            renderer.autoClear = false;
            //renderer.sortObjects = false;
            renderer.gammaInput = true;
            renderer.gammaOutput = true;
            renderer.shadowMapEnabled = true;
            //renderer.shadowMapCullFace = THREE.CullFaceBack;
            renderer.shadowMapType = THREE.PCFSoftShadowMap;

            container = document.getElementById("viewport");
            container.appendChild( renderer.domElement );
            renderer.domElement.style.top = 0 + "px";
            renderer.domElement.style.left = 0 + "px";
            renderer.domElement.style.position = "absolute";

            // SCENE
            scene = new THREE.Scene();

            // CAMERA
            camera = new THREE.PerspectiveCamera( 45, vsize.z, 1, FAR );
            //camera.position.set( 0, 30, 100 );
            center = new THREE.Vector3(0,30,0);
            centerLight =  new THREE.Vector3(0,-45,0);
            moveCamera();


            addBasicObject();

            initLightAndSky();

            //importBody();

            window.addEventListener( 'resize', resize, false );
            container.addEventListener( 'mousemove', onMouseMove, false );
            container.addEventListener( 'mousedown', onMouseDown, false );
            container.addEventListener( 'mouseout', onMouseUp, false );
            container.addEventListener( 'mouseup', onMouseUp, false );

            var body = document.body;
            if( body.addEventListener ){
                body.addEventListener( 'mousewheel', onMouseWheel, false ); //chrome
                body.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
            }else if( body.attachEvent ){
                body.attachEvent("onmousewheel" , onMouseWheel); // ie
            }
            animate();
        }

        //-----------------------------------------------------
        //
        //  RENDER LOOP
        //
        //-----------------------------------------------------

        function animate() {
            requestAnimationFrame( animate );
            render();
        }

        function render() {
            updateBVH();
            renderer.clear();
            renderer.render( scene, camera );
        }

        //-----------------------------------------------------
        //  LISTENER
        //-----------------------------------------------------

        function resize( event ) {
            vsize.x = window.innerWidth;
            vsize.y = window.innerHeight;
            vsize.z = vsize.x / vsize.y;
            camera.aspect = vsize.z;
            camera.updateProjectionMatrix();
            renderer.setSize( vsize.x, vsize.y );
        }

        //-----------------------------------------------------
        //  LIGHT & SKY
        //-----------------------------------------------------

        function initLightAndSky(){

            ambient = new THREE.AmbientLight( 0x202020 );
            scene.add( ambient );

            hemiLight = new THREE.HemisphereLight( 0x202020, 0xffffff, 1 );
            hemiLight.position.set( 0, 20, 0 );
            scene.add( hemiLight );

            pointLight = new THREE.PointLight( 0xFFFFFF, 1, 600 );
            scene.add( pointLight );

            light = new THREE.SpotLight( 0xFFFFFF, 1, 0, Math.PI/2, 1 );
            light.castShadow = true;
            light.onlyShadow = false;
            light.shadowCameraNear = 50;
            light.shadowCameraFar = 500;
            //light.shadowCameraFov = 35;
            light.shadowBias = -0.005;
            light.shadowMapWidth = light.shadowMapHeight = 1024;
            light.shadowDarkness = 0.35;

            moveLight();

            //light.shadowCameraVisible = true;

            scene.add( light );
        }

        function moveLight() {
            light.position.copy(Orbit(centerLight, lightPos.horizontal, lightPos.vertical, lightPos.distance));
            pointLight.position.copy(Orbit(centerLight, lightPos.horizontal+180, lightPos.vertical+180, lightPos.distance));
            light.lookAt(centerLight);
        }

        function lightColors( cc ){
            ambient.color.setHex(cc[2]);

            hemiLight.color.setHex( cc[2] );
            hemiLight.groundColor.setHex( cc[0] );

            pointLight.color.setHex( cc[1] );

            light.color.setHex( cc[3] );

            currentColors = cc;
        }

        function addBasicObject() {
            var skyMaterial = new THREE.MeshBasicMaterial( { color: 0x303030, side: THREE.BackSide, depthWrite: false } );
            sky = new THREE.Mesh( new THREE.BoxGeometry( FAR, FAR, FAR ), skyMaterial );
            scene.add( sky );

            var groundMaterial = new THREE.MeshBasicMaterial( { color: 0xFFFFFF, transparent: true } );
            var blendings = [ "NoBlending", "NormalBlending", "AdditiveBlending", "SubtractiveBlending", "MultiplyBlending", "AdditiveAlphaBlending" ];
            groundMaterial.blending = THREE[ blendings[ 4 ] ];
            ground = new THREE.Mesh(new THREE.PlaneGeometry( 1000, 1000, 4, 4 ), groundMaterial);
            ground.position.set( 0, 0, 0 );
            ground.rotation.x = - Math.PI / 2;
            ground.receiveShadow = true;
            scene.add( ground );

            var helper2 = new THREE.GridHelper( 100, 50 );
            helper2.setColors( 0x00ff00, 0x888888 );
            scene.add( helper2 );
        }

        //-----------------------------------------------------
        //  BVH TEST
        //-----------------------------------------------------

        const BVHset = {ax:"x", ay:"y", az:"z", dx:1, dy:1, dz:1, rx:0, ry:0, rz:0, order:"XYZ"};
        const BVHanimConfig = {
            debug:true,
            speed:1.3,
            size:1,
            px:0, py:-22, pz:0,
            boneSize:0.83
        }

        function loadBVH(name) {
            bvhReader.load(`res/bvh/${name}`)
        }

        function initBVHGui(bvhReader) {
            const f5 = gui.addFolder(`BVH Animation BETA ${bvhReader.name}`);

            BVHanimConfig.calibration = function() { loadBVH("calibration.png"); };
            BVHanimConfig.ballet = function() { loadBVH("ballet.png"); };
            BVHanimConfig.shoot = function() { loadBVH("shoot.png"); };
            BVHanimConfig.sprint = function() { loadBVH("sprint.png"); };
            BVHanimConfig.exsize = function() { loadBVH("exsize.png"); };
            BVHanimConfig.test = function() { loadBVH("test.png"); };
            BVHanimConfig.big = function() { loadBVH("big.png"); };

            BVHanimConfig.c11A = function() { loadBVH("c11A.png"); };
            BVHanimConfig.c11B = function() { loadBVH("c11B.png"); };

            BVHanimConfig.dance = function() { loadBVH("dance.png"); };

            BVHanimConfig.stop = null
            BVHanimConfig.play = null
            BVHanimConfig.next = function() { bvhReader.next(); };
            BVHanimConfig.prev = function() { bvhReader.prev(); };


            // f5.add( BVHanimConfig, 'calibration' );
            // f5.add( BVHanimConfig, 'ballet' );
            // f5.add( BVHanimConfig, 'shoot' );
            // f5.add( BVHanimConfig, 'sprint' );
            // f5.add( BVHanimConfig, 'exsize' );
            // f5.add( BVHanimConfig, 'test' );
            // f5.add( BVHanimConfig, 'big' );
            // f5.add( BVHanimConfig, 'c11A' );
            // f5.add( BVHanimConfig, 'c11B' );
            //  f5.add( BVHanimConfig, 'dance' );

            f5.add( BVHanimConfig, 'speed', 0.01, 2 ).onChange( function() { bvhReader.speed = BVHanimConfig.speed; });;

            // f5.add( BVHanimConfig, 'stop' );
            // f5.add( BVHanimConfig, 'play' )
            // f5.add( BVHanimConfig, 'next' );
            // f5.add( BVHanimConfig, 'prev' );

            f5.add( BVHanimConfig, 'size', 1, 10 ).onChange( function() { bvhReader.reScale(BVHanimConfig.size) });
            f5.add( BVHanimConfig, 'px', -100, 100 ).onChange( function() { positionBVH() });;
            f5.add( BVHanimConfig, 'py', -100, 100 ).onChange( function() { positionBVH() });;
            f5.add( BVHanimConfig, 'pz', -100, 100 ).onChange( function() { positionBVH() });;

            f5.add( BVHanimConfig, 'boneSize', 0.1, 5 ).onChange( function() { bvhReader.boneSize = BVHanimConfig.boneSize; });

            f5.open();

        }
        function positionBVH() {
            bvhReader.rePosition(new THREE.Vector3( BVHanimConfig.px || 0, BVHanimConfig.py|| 0, BVHanimConfig.pz|| 0 ))
        }

        function updateBVH() {
            if(bvhReader !== null && bvhReader.play){

                bvhReader.update();
            }
        }

        // const graphLineColours = [
        //     '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
        //     '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
        //     '#bcbd22', '#17becf'
        // ]
        const graphLineColours = [
            'rgba(31, 119, 180, 1)',  // Blue
            'rgba(255, 127, 14, 0.9)',  // Orange
            'rgba(44, 160, 44, 0.8)',  // Green
            'rgba(214, 39, 40, 0.7)',  // Red
            'rgba(148, 103, 189, 0.6)',  // Purple
            'rgba(140, 86, 75, 0.5)',  // Brown
            'rgba(227, 119, 194, 0.4)',  // Pink
            'rgba(127, 127, 127, 0.3)',  // Gray
            'rgba(188, 189, 34, 0.2)',  // Olive
            'rgba(23, 190, 207, 0.1)'  // Cyan
        ];
        let graphLineColourIdx = 0;


        function toAngles(o) {
            var q = o.quaternion.clone();
            var x = q.x,
                y = q.y,
                z = q.z,
                w = q.w;

            var a = 2 * (w * y - z * x);

            if (a < -1) a = -1;
            else if (a > 1) a = 1;

            return {
                x : Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)) * 1,
                y : Math.asin(a) * 1,
                z : Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)) * 1
            }
        }

        function traceMatrix(o, n) {
            var e = o.matrix.elements
            var s = o.name+"<br>";
            var q = o.quaternion.clone();
            //s+=( q.x ).toFixed(2)+ "_"+ ( q.y ).toFixed(2) +  "_"+ (q.z).toFixed(2)+ "_"+  (q.w).toFixed(2);
            //s+=( b.rot.x * ToDeg ).toFixed(2)+ "_"+ ( b.rot.y * ToDeg ).toFixed(2) +  "_"+ ( b.rot.z * ToDeg ).toFixed(2);

            //s+= "<br>"

            s+=( o.rotation.x * ToDeg ).toFixed(2)+ "_"+ ( o.rotation.y * ToDeg ).toFixed(2) +  "_"+ ( o.rotation.z * ToDeg ).toFixed(2)+ "_"+ o.rotation.order;

            s+= "<br>"

            s += "_"+ e[0].toFixed(2) + "_" + e[1].toFixed(2) + "_"+ e[2].toFixed(2) + "_" + e[3] + "<br>";
            s += "_"+ e[4].toFixed(2) + "_" + e[5].toFixed(2) + "_"+ e[6].toFixed(2) + "_" + e[7] + "<br>";
            s += "_"+ e[8].toFixed(2) + "_" + e[9].toFixed(2) + "_"+ e[10].toFixed(2) + "_" + e[11] + "<br>";
            s += "_"+ e[12] + "_" + e[13] + "_"+ e[14] + "_" + e[15] + "<br>";

            if(n===1) out1.innerHTML = s;
            else out2.innerHTML = s;
        }



        //-----------------------------------------------------
        //  GUI
        //-----------------------------------------------------

        function addGUI() {
            gui = new dat.GUI({autoPlace:false, width:204});
            document.getElementById('gui').appendChild(gui.domElement);
        }

        function tell(s){
            document.getElementById("debug").innerHTML = s;
        }



        //-----------------------------------
        // MATH
        //-----------------------------------

        function Orbit(origine, horizontal, vertical, distance) {
            var p = new THREE.Vector3();
            var phi = vertical*ToRad;
            var theta = horizontal*ToRad;
            p.x = (distance * Math.sin(phi) * Math.cos(theta)) + origine.x;
            p.z = (distance * Math.sin(phi) * Math.sin(theta)) + origine.z;
            p.y = (distance * Math.cos(phi)) + origine.y;
            return p;
        }

        //-----------------------------------
        // MOUSE & NAVIGATION
        //-----------------------------------

        var changeView = function (h, v, d) {
            TweenLite.to(camPos, 3, {horizontal: h, vertical: v, distance: d, onUpdate: moveCamera });
            camPos.automove = true;
        }

        function moveCamera() {
            camera.position.copy(Orbit(center, camPos.horizontal, camPos.vertical, camPos.distance));
            camera.lookAt(center);
        }

        function onMouseDown(e) {
            e.preventDefault();
            mouse.ox = e.clientX;
            mouse.oy = e.clientY;
            mouse.h = camPos.horizontal;
            mouse.v = camPos.vertical;
            mouse.down = true;
        }

        function onMouseUp(e) {
            mouse.down = false;
            document.body.style.cursor = 'auto';
        }

        function onMouseMove(e) {
            e.preventDefault();
            if (mouse.down ) {
                document.body.style.cursor = 'move';
                if(SeaStandard)camPos.horizontal = (-(e.clientX - mouse.ox) * 0.3) + mouse.h;
                else camPos.horizontal = ((e.clientX - mouse.ox) * 0.3) + mouse.h;
                camPos.vertical = (-(e.clientY - mouse.oy) * 0.3) + mouse.v;

                moveCamera();
            } else {
                mouse.ox = e.clientX;
                mouse.oy = e.clientY;
            }
        }

        function onMouseWheel(e) {
            var delta = 0;
            if(e.wheelDelta){delta=e.wheelDelta*-1;}
            else if(e.detail){delta=e.detail*20;}
            camPos.distance+=(delta/10);

            moveCamera();
            e.preventDefault();
        }

        /**
         * @param bvhReader {BVHReader}
         */
        function initBVH(bvhReader) {
            bvhReader.initUI('progressBar', 'playPauseButton', "featureBar");
            bvhReader.speed = BVHanimConfig.speed;

            // loadBVH("action.png");

            initBVHGui(bvhReader);
        }

        // fit a rect into some container, keeping the aspect ratio of the rect
        function fitRectIntoContainer (rectWidth, rectHeight, containerWidth, containerHeight) {

            const widthRatio = containerWidth / rectWidth;    // ratio container width to rect width
            const heightRatio = containerHeight / rectHeight; // ratio container height to rect height

            const ratio = Math.min( widthRatio, heightRatio ); // take the smaller ratio

            // new rect width and height, scaled by the same ratio
            return {
                width: rectWidth * ratio,
                height: rectHeight * ratio,
            };
        }

        /**
         *
         * @param canvas {HTMLCanvasElement}
         * @param width {number}
         * @param height {number}
         */
        function resizeCanvas(canvas, width, height) {
            // Set the canvas drawing surface width and height
            canvas.width = width;
            canvas.height = height;

            // Optionally set the CSS width and height
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            // Optionally, redraw or reinitialize your canvas content
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
                // Redraw content here if needed
            }
        }
        const graphCanvas = $("canvas#graphCanvas")
        const graphCanvasElement = graphCanvas.get(0)
        const canvasContainer = $("#progressContainer")
        const canvasSize = fitRectIntoContainer(
            graphCanvas.width(),
            graphCanvas.height(),
            canvasContainer.width(),
            canvasContainer.height()
        );
        resizeCanvas(graphCanvasElement, canvasSize.width, canvasSize.height)

        const progressBar = new ProgressBar('progressBar', 'playPauseButton');
        const bvhManager = new BVHManager(progressBar);
        const annotationGraph = new AnnotationGraphManager(graphCanvasElement)
        bvhManager.addAnimatable(annotationGraph)

        $('#bvh-file').on('change', function(evt) {
            const files = evt.target.files;
            if (!files) return;

            for (const file of files) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const bvhReader = new BVHReader(scene);
                    initBVH(bvhReader)
                    bvhReader.parseData(e.target.result.split(/\s+/g));
                    bvhManager.addAnimatable(bvhReader);
                    bvhManager.reset();

                    annotationGraph.graphFrames = bvhManager.getNumFrames()
                    annotationGraph.clearGraph()
                    annotationGraph.drawGraph()
                };
                reader.readAsText(file);
            }
        });

        $('#annotation-file').on('change', function(evt) {
            const file = evt.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const motionData = JSON.parse(e.target.result);
                    const strokeStyle = graphLineColours[graphLineColourIdx]
                    graphLineColourIdx = (graphLineColourIdx + 1) % graphLineColours.length
                    const annotationGraphLine = new AnnotationGraphLine(
                        graphCanvasElement,
                        motionData,
                        strokeStyle,
                        5
                    )
                    annotationGraph.addGraphLine(annotationGraphLine)
                    annotationGraph.graphFrames = bvhManager.getNumFrames()
                    annotationGraph.clearGraph()
                    annotationGraph.drawGraph()
                    bvhManager.reset()
                } catch (error) {
                    console.error(error)
                }
            };
            reader.readAsText(file);
        });

        // bvhManager.togglePlay();
        init()
    });

}(window.jQuery, window, document));
