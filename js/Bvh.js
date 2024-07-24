const BVH = { REVISION: '0.1a' };

BVH.TO_RAD = Math.PI / 180;
window.URL = window.URL || window.webkitURL;

class BVHManager {
	/**
	 * @param progressBar {ProgressBar}
	 * @param bvhReaders {BVHReader[]}
	 * @param annotationGraphs {AnnotationGraphLine[]}
	 * @param frames_per_second {number}
	 */
	constructor(
		progressBar,
		bvhReaders = [],
		annotationGraphs = [],
		frames_per_second = 24.98,
	) {
		this.bvhReaders = bvhReaders;
		this.progressBar = progressBar;
		this.currentFrame = 0;
		this.annotationGraphs = annotationGraphs;
		/**
		 * @type {Animatable[]}
		 */
		this.animatables = [this.progressBar, ...this.bvhReaders, ...this.annotationGraphs]

		this.progressBar.setUpdateCallback(this.gotoFrame.bind(this));
		this.progressBar.setTogglePlayCallback(this.togglePlay.bind(this));

		this.startTimeStamp = 0;
		this.previousTimeStamp = 0;

		this.timeElapsedSinceLastFrame = 0;
		this.frames_per_second = frames_per_second;
	}

	set frames_per_second(value) {
		this._frames_per_second = value;
		this._seconds_per_frame = 1 / value;
	}

	get frames_per_second() {
		return this._frames_per_second;
	}

	get seconds_per_frame() {
		return this._seconds_per_frame;
	}


	/**
	 * @param animatable {Animatable}
	 */
	addAnimatable(animatable) {
		this.animatables.push(animatable);
		const numFrames = animatable.getNumFrames();
		console.log("numFrames", numFrames);
		if (numFrames > this.progressBar.numFrames) {
			console.log("new Max Num Frames", numFrames);
			this.progressBar.setNumFrames(numFrames);
		}
	}

	getNumFrames() {
		const maxFrames = this.animatables.reduce((max, obj) => {
			let numFrames = obj.getNumFrames();
			return numFrames > max ? numFrames : max;
		}, 0);
		return maxFrames;
	}

	/**
	 * @param frame {number}
	 */
	gotoFrame(frame) {
		console.log("Frame", frame);
		this.progressBar.setNumFrames(this.getNumFrames())
		this.currentFrame = frame;
		this.animatables.forEach(a => a.gotoFrame(frame))
	}

	togglePlay() {
		this.progressBar.playing = !this.progressBar.playing;
		if (this.progressBar.playing) {
			this.progressBar.setNumFrames(this.getNumFrames())
			this.startTimeStamp = performance.now()
			this.previousTimeStamp = this.startTimeStamp
			this.currentAnimationFrame = requestAnimationFrame(this.updateHelper.bind(this));
		}
		else {
			if (this.currentAnimationFrame) {
				cancelAnimationFrame(this.currentAnimationFrame);
			}
		}
	}

	/**
	 * @param deltaTime {number}
	 */
	update(deltaTime) {
		this.timeElapsedSinceLastFrame += deltaTime;

		if (this.timeElapsedSinceLastFrame >= this.seconds_per_frame) {
			this.currentFrame += 1;
			this.gotoFrame(this.currentFrame)
			this.timeElapsedSinceLastFrame -= this.seconds_per_frame;
		}
	}

	/**
	 * @param currentTimeStamp {number}
	 */
	updateHelper(currentTimeStamp) {
		if (!this.startTimeStamp) {
			this.startTimeStamp = performance.now();
		}

		const deltaTime = (currentTimeStamp - this.previousTimeStamp) / 1000;
		this.update(deltaTime)
		this.previousTimeStamp = currentTimeStamp;

		this.currentAnimationFrame = requestAnimationFrame(this.updateHelper.bind(this));
	}

	reset() {
		this.startTime = Date.now();
		this.animatables.forEach(a => a.reset())
	}

	getSpeed() {
		// Return a common speed or individual speeds based on implementation
		return 24.8;
	}
}

class BVHReader extends Animatable{
	static num = 1;

	/**
	 *
	 * @param scene {THREE.Scene}
	 */
	constructor(scene) {
		super()

		this.scene = scene
		this.name = `bvh-reader-${BVHReader.num}`
		BVHReader.num += 1;
		this.debug = true;
		this.type = "";
		this.data = null;
		this.root = null;
		this.numFrames = 0;
		this.secsPerFrame = 0;
		this.play = false;
		this.channels = null;
		this.lines = "";

		this.speed = 1;

		this.nodes = null;

		this.frame = 0;
		this.oldFrame = 0;
		this.startTime = 0;

		this.position = new THREE.Vector3(0, 0, 0);
		this.scale = 1;

		this.tmpOrder = "";
		this.tmpAngle = [];

		this.skeleton = null;
		this.bones = [];
		this.boneSize = 0.83;

		this.material = new THREE.MeshNormalMaterial();

		this.progressBar = null;
		this.playPauseButton = null;

		this.currentFeatureProperty = null;
		this.valueDisplay = null;
		this.propertySelect = null;
		this.motionData = null;
		this.featureBar = null;

		this.graphCanvas = document.getElementById('graphCanvas');
		this.graphCanvasCtx = this.graphCanvas.getContext('2d');
	}

	load(fname) {
		this.type = fname.substring(fname.length - 3, fname.length);

		const xhr = new XMLHttpRequest();
		xhr.open('GET', fname, true);

		if (this.type === 'bvh') {
			xhr.onreadystatechange = () => {
				if (xhr.readyState === 4) {
					this.parseData(xhr.responseText.split(/\s+/g));
				}
			};
		} else if (this.type === 'png') {
			xhr.responseType = 'blob';
			xhr.onload = () => {
				if (xhr.readyState === 4) {
					const blob = xhr.response;
					const img = document.createElement('img');
					img.onload = () => {
						let c = document.createElement("canvas"), r = '', pix, i, string = "";
						c.width = img.width;
						c.height = img.height;
						c.getContext('2d').drawImage(img, 0, 0);
						const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
						for (i = 0, l = d.length; i < l; i += 4) {
							pix = d[i];
							if (pix < 96) string += String.fromCharCode(pix + 32);
						}
						const array = string.split(",");
						this.parseData(array);
						window.URL.revokeObjectURL(img.src);
					};
					img.src = window.URL.createObjectURL(blob);
				}
			};
		}
		xhr.send(null);
	}

	parseMotionData(result) {
		this.motionData = result;
		this.populatePropertySelect();
	}

	populatePropertySelect() {
		if (!this.propertySelect) {
			console.error("no propertySelect in document tree");
			return;
		}

		this.propertySelect.addEventListener('change', this.handleFeaturePropertySelect.bind(this));
		this.propertySelect.disabled = false;

		this.propertySelect.innerHTML = '<option value="">Select a property</option>';
		const properties = Object.keys(this.motionData).filter(prop =>
			Array.isArray(this.motionData[prop]) && this.motionData[prop].length > 0
		);
		properties.forEach((prop, index) => {
			const option = document.createElement('option');
			option.value = prop;
			option.textContent = prop;
			this.propertySelect.appendChild(option);
			if (index === 0) {
				this.propertySelect.selectedIndex = 0;
			}
		});
	}

	handleFeaturePropertySelect() {
		if (!this.propertySelect) {
			alert();
		}
		this.currentFeatureProperty = this.propertySelect.value;
		this.updateFeatureBar();
		this.drawGraph();
	}

	parseData(data) {
		this.data = data;
		this.channels = [];
		this.nodes = [];
		let done = false;
		while (!done) {
			switch (this.data.shift()) {
				case 'ROOT':
					if (this.root !== null) this.clearNode();

					this.root = this.parseNode(this.data);
					this.root.position.copy(this.position);
					this.root.scale.set(this.scale, this.scale, this.scale);

					if (this.debug) {
						this.addSkeleton(this.nodes.length);
					}
					break;
				case 'MOTION':
					this.data.shift();
					this.numFrames = parseInt(this.data.shift());
					this.data.shift();
					this.data.shift();
					this.secsPerFrame = parseFloat(this.data.shift());
					done = true;
			}
		}

		this.getNodeList();
		this.startTime = Date.now();
		this.play = true;

		if (this.progressBar) this.progressBar.disabled = false;
		if (this.playPauseButton) this.playPauseButton.disabled = false;
		this.togglePlay();
	}

	/**
	 *
	 * @returns {int}
	 */
	getNumFrames() {
		return this.numFrames;
	}

	reScale(s) {
		this.scale = s;
		this.root.scale.set(this.scale, this.scale, this.scale);
	}

	rePosition(v) {
		this.position = v;
		this.root.position.copy(this.position);
	}

	getNodeList() {
		let n = this.nodes.length;
		let s = "";
		for (let i = 0; i < n; i++) {
			const node = this.nodes[i];
			s += node.name + " _ " + i + "<br>";
		}
		if (out2) out2.innerHTML = s;
	}

	addSkeleton(n) {
		this.skeleton = new THREE.Object3D();
		this.bones = [];

		const geo = new THREE.CubeGeometry(this.boneSize, this.boneSize, 1);
		geo.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, 0.5));

		for (let i = 0; i < this.nodes.length; i++) {
			const node = this.nodes[i];
			if (node.name !== 'Site') {
				const bone = new THREE.Mesh(geo, this.material);
				bone.castShadow = true;
				bone.rotation.order = 'XYZ';
				bone.name = node.name;
				this.skeleton.add(bone);
				this.bones[i] = bone;
			}
		}
		this.scene.add(this.skeleton);
	}

	updateSkeleton() {
		for (let i = 0; i < this.nodes.length; i++) {
			const node = this.nodes[i];
			const bone = this.bones[i];

			if (node.name !== 'Site') {
				const mtx = node.matrixWorld;
				bone.position.setFromMatrixPosition(mtx);
				if (node.children.length) {
					const target = new THREE.Vector3().setFromMatrixPosition(node.children[0].matrixWorld);
					bone.lookAt(target);
					bone.rotation.z = 0;

					if (bone.name === "Head") {
						bone.scale.set(this.boneSize * 2, this.boneSize * 2, BVH.DistanceTest(bone.position, target) * (this.boneSize * 1.5));
					} else {
						bone.scale.set(this.boneSize, this.boneSize, BVH.DistanceTest(bone.position, target));
					}
				}
			}
		}
	}

	transposeName(name) {
		const nameMap = {
			"hip": "Hips",
			"abdomen": "Spine1",
			"chest": "Chest",
			"neck": "Neck",
			"head": "Head",
			"lCollar": "LeftCollar",
			"rCollar": "RightCollar",
			"lShldr": "LeftUpArm",
			"rShldr": "RightUpArm",
			"lForeArm": "LeftLowArm",
			"rForeArm": "RightLowArm",
			"lHand": "LeftHand",
			"rHand": "RightHand",
			"lFoot": "LeftFoot",
			"rFoot": "RightFoot",
			"lThigh": "LeftUpLeg",
			"rThigh": "RightUpLeg",
			"lShin": "RightLowLeg",
			"rShin": "LeftLowLeg",
			"RightHip": "RightUpLeg",
			"LeftHip": "LeftUpLeg",
			"RightKnee": "RightLowLeg",
			"LeftKnee": "LeftLowLeg",
			"RightAnkle": "RightFoot",
			"LeftAnkle": "LeftFoot",
			"RightShoulder": "RightUpArm",
			"LeftShoulder": "LeftUpArm",
			"RightElbow": "RightLowArm",
			"LeftElbow": "LeftLowArm",
			"RightWrist": "RightHand",
			"LeftWrist": "LeftHand",
			"rcollar": "RightCollar",
			"lcollar": "LeftCollar",
			"rtoes": "RightToe",
			"ltoes": "LeftToe",
			"upperback": "Spine1"
		};
		return nameMap[name] || name;
	}

	parseNode(data) {
		let name = data.shift();
		name = this.transposeName(name);
		const node = new THREE.Object3D();
		node.name = name;

		let done = false;
		while (!done) {
			switch (data.shift()) {
				case 'OFFSET':
					node.position.set(parseFloat(data.shift()), parseFloat(data.shift()), parseFloat(data.shift()));
					node.offset = node.position.clone();
					break;
				case 'CHANNELS':
					const n = parseInt(data.shift());
					for (let i = 0; i < n; i++) {
						this.channels.push({ node: node, prop: data.shift() });
					}
					break;
				case 'JOINT':
				case 'End':
					node.add(this.parseNode(data));
					break;
				case '}':
					done = true;
			}
		}
		this.nodes.push(node);
		return node;
	}

	clearNode() {
		if (out2) out2.innerHTML = "";

		if (this.nodes) {
			for (let i = 0; i < this.nodes.length; i++) {
				this.nodes[i] = null;
			}
			this.nodes.length = 0;

			if (this.bones.length > 0) {
				for (let i = 0; i < this.bones.length; i++) {
					if (this.bones[i]) {
						this.bones[i].geometry.dispose();
					}
				}
				this.bones.length = 0;
				this.scene.remove(this.skeleton);
			}
		}
	}

	animate() {
		let n = this.frame % this.numFrames * this.channels.length;
		const ref = this.channels;
		let isRoot = false;

		for (let i = 0; i < ref.length; i++) {
			const ch = ref[i];
			if (ch.node.name === "Hips") isRoot = true;
			else isRoot = false;

			switch (ch.prop) {
				case 'Xrotation':
					this.autoDetectRotation(ch.node, "X", parseFloat(this.data[n]));
					break;
				case 'Yrotation':
					this.autoDetectRotation(ch.node, "Y", parseFloat(this.data[n]));
					break;
				case 'Zrotation':
					this.autoDetectRotation(ch.node, "Z", parseFloat(this.data[n]));
					break;
				case 'Xposition':
					if (isRoot) ch.node.position.x = ch.node.offset.x + parseFloat(this.data[n]) + this.position.x;
					else ch.node.position.x = ch.node.offset.x + parseFloat(this.data[n]);
					break;
				case 'Yposition':
					if (isRoot) ch.node.position.y = ch.node.offset.y + parseFloat(this.data[n]) + this.position.y;
					else ch.node.position.y = ch.node.offset.y + parseFloat(this.data[n]);
					break;
				case 'Zposition':
					if (isRoot) ch.node.position.z = ch.node.offset.z + parseFloat(this.data[n]) + this.position.z;
					else ch.node.position.z = ch.node.offset.z + parseFloat(this.data[n]);
					break;
			}

			n++;
		}

		if (this.bones.length > 0) this.updateSkeleton();
	}

	autoDetectRotation(Obj, Axe, Angle) {
		this.tmpOrder += Axe;
		const angle = Angle * BVH.TO_RAD;

		if (Axe === "X") this.tmpAngle[0] = angle;
		else if (Axe === "Y") this.tmpAngle[1] = angle;
		else this.tmpAngle[2] = angle;

		if (this.tmpOrder.length === 3) {
			const e = new THREE.Euler(this.tmpAngle[0], this.tmpAngle[1], this.tmpAngle[2], this.tmpOrder);
			Obj.setRotationFromEuler(e);

			Obj.updateMatrixWorld();

			this.tmpOrder = "";
			this.tmpAngle.length = 0;
		}
	}

	updateFeatureBar() {
		if (!this.currentFeatureProperty || !this.motionData[this.currentFeatureProperty] || !this.featureBar) return;

		let frame_idx = this.frame;
		if (frame_idx >= this.motionData[this.currentFeatureProperty].length) {
			frame_idx = this.motionData[this.currentFeatureProperty].length - 1;
		}

		const value = this.motionData[this.currentFeatureProperty][frame_idx];
		const height = value * 100;
		this.featureBar.style.height = `${height}%`;

		if (!this.valueDisplay) return;
		this.valueDisplay.textContent = value.toFixed(2);
	}

	drawGraph() {
		const width = this.graphCanvas.width;
		const height = this.graphCanvas.height;

		const featureValues = this.motionData[this.currentFeatureProperty];

		// const min = Math.min(...featureValues);
		const min = 0.0;
		// const max = Math.max(...featureValues);
		const max = 1.0;
		const range = max - min;
		const ctx = this.graphCanvasCtx
		ctx.clearRect(0, 0, width, height);

		ctx.beginPath();
		ctx.strokeStyle = '#4CAF50';
		ctx.lineWidth = 2;

		featureValues.forEach((value, index) => {
			const x = (index / (featureValues.length - 1)) * width;
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

	reset() {
		this.oldFrame = 0;
		this.frame = 1;
		this.rePosition(new THREE.Vector3(0, -22, 0));
		this.animate();
		this.update();
	}

	next() {
		this.play = false;
		this.frame++;
		if (this.frame > this.numFrames) this.frame = 0;
		this.animate();
	}

	prev() {
		this.play = false;
		this.frame--;
		if (this.frame < 0) this.frame = this.numFrames;
		this.animate();
	}

	initUI(progressBarId, playPauseButtonId, featureBarId) {
		this.progressBar = document.getElementById(progressBarId);
		this.playPauseButton = document.getElementById(playPauseButtonId);
		this.featureBar = document.getElementById(featureBarId);
		this.propertySelect = document.getElementById("propertySelect");
		this.valueDisplay = document.getElementById("valueDisplay");
	}

	/**
	 * @param frame {number}
	 */
	gotoFrame(frame) {
		if (frame >= this.numFrames) {
			this.play = false;
			frame = this.numFrames - 1;
		}
		this.frame = frame;
		this.animate();
	}

	// gotoFrame(frame) {
	// 	this.frame = frame;
	// 	this.animate();
	// 	this.updateFeatureBar();
	// 	this.update();
	// }

	togglePlay() {
		this.play = !this.play;
		if (this.play) {
			this.playPauseButton.textContent = 'Pause';
			this.oldFrame = this.frame;
			this.startTime = Date.now();
			this.play = true;
		} else {
			this.playPauseButton.textContent = 'Play';
		}
	}

	/**
	 * @param frame {number}
	 */
	update(frame) {
		if (frame > this.numFrames) {
			this.play = false;
			this.frame = this.numFrames - 1;
			return;
		}
		this.frame = frame;
		this.animate();
	}
}

BVH.DistanceTest = function(p1, p2) {
	const x = p2.x - p1.x;
	const y = p2.y - p1.y;
	const z = p2.z - p1.z;
	let d = Math.sqrt(x * x + y * y + z * z);
	if (d <= 0) d = 0.1;
	return d;
};

BVH.Reader = BVHReader;
BVH.Manager = BVHManager;
