import * as THREE from 'three';
import { THREEx } from '@ar-js-org/ar.js-threejs';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import cameraPara from "./assets/camera_para.dat?url";
import { MarkerCradle } from './markerCradle';
import {type MarkerInfo, DebugMode, DenbaSettings, ARSettings} from './settings';
import { makeClipAdditive } from 'three/src/animation/AnimationUtils.js';
const width = 640*2;
const height = 480*2;

const stats = DebugMode ? new Stats() : undefined;
if(stats){
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
}

class ArController{
    private readonly markerCradle : MarkerCradle;
    private readonly renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    private readonly scene = new THREE.Scene();
    private readonly raycaster = new THREE.Raycaster();
    private readonly cursor = new THREE.Vector2();
    private readonly arToolkitContext = new THREEx.ArToolkitContext({
        cameraParametersUrl: cameraPara,
        detectionMode:'mono_and_matrix',
        matrixCodeType:'3x3_PARITY65',
        debug: false,
    });
    tickFunc?: (markers:MarkerInfo[], cursor:THREE.Vector2, baseMakerSurvived: boolean) => void;

    constructor(){
        const renderer = this.renderer;
        const canvas = renderer.domElement;
        renderer.localClippingEnabled = true;
        renderer.setClearColor(new THREE.Color(), 0);
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(canvas);

        const scene = this.scene;
        scene.visible = false;

        const camera = new THREE.PerspectiveCamera();
        scene.add(camera);

        const light = new THREE.DirectionalLight(0xffffff, 4);
        light.position.set(1, 5, 10);
        light.lookAt(0, 0, 0);
        scene.add(light);
        
        const arToolkitSource = new THREEx.ArToolkitSource({
            sourceType: 'webcam',
            sourceWidth: width,
            sourceHeight: height,
        });

        const arToolkitContext = this.arToolkitContext;
        arToolkitContext.init(() => {
            camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
        });

        this.markerCradle = new MarkerCradle();
        for(const {barcodeValue, root} of this.markerCradle.getMarkerRoots()){
            new THREEx.ArMarkerControls(arToolkitContext, root, {
                type: 'barcode',
                barcodeValue,
                changeMatrixMode: 'modelViewMatrix',
            });
            scene.add(root);
        }
        scene.add(this.markerCradle.getViOrigin());

        const cursorDetectPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(DenbaSettings.L, DenbaSettings.L),
            new THREE.MeshBasicMaterial({colorWrite: false, depthWrite: false})
        );
        cursorDetectPlane.rotation.x = -Math.PI/2;
        this.addToViOrigin(cursorDetectPlane);

        const onResize = () => {
            arToolkitSource.onResizeElement();
            arToolkitSource.copyElementSizeTo(canvas);
            if (arToolkitContext.arController) {
                arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
            }
        };
        window.addEventListener('resize', onResize);
        arToolkitSource.init(
            () => {setTimeout(() => {onResize();}, 500);},
            () => {}
        );

        const onHandleMove = (event: MouseEvent|TouchEvent) => {
            if(event instanceof MouseEvent){
                if(event.buttons%2===0) return;
            }
            const mouse = this.getRelativePos(event);
            this.raycaster.setFromCamera(mouse, camera);
            const intersects = this.raycaster.intersectObjects([cursorDetectPlane]);
            if(intersects.length > 0){
                const point = intersects[0].point;
                const posBase  = this.markerCradle.getOriginPos(point);
                this.cursor.set(posBase.x, posBase.z);
            }
        };
        renderer.domElement.addEventListener('mousemove', onHandleMove);
        renderer.domElement.addEventListener('touchmove', onHandleMove);

        let frame = 0;
        renderer.setAnimationLoop((() =>{
            renderer.render(scene, camera); 
            if (arToolkitSource.ready) {
                if(frame % ARSettings.FrameSkip === 0) arToolkitContext.update(arToolkitSource.domElement);
                scene.visible = camera.visible;
                this.tick();
                frame++;
            }
        }));
    }

    addToViOrigin(object:THREE.Object3D){
        this.markerCradle.getViOrigin().add(object);
    }

    private tick(){
        stats?.begin();
        const {markerInfos, originSurvived} = this.markerCradle.getMarkerInfos();
        this.tickFunc?.(markerInfos, this.cursor, originSurvived);
        stats?.end();
    }

    private getRelativePos(event: MouseEvent|TouchEvent):THREE.Vector2{
        const element =  event.target as HTMLElement;
        const rect = element.getBoundingClientRect();
        let [x, y] = [0, 0];
        if(event instanceof MouseEvent){
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
        }
        else if(event instanceof TouchEvent && event.touches.length > 0){
            x = event.touches[0].clientX - rect.left;
            y = event.touches[0].clientY - rect.top;
        }
        return new THREE.Vector2((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
    }
}

export const ArCtrl = new ArController();