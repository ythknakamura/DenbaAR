import * as THREE from 'three';
import { THREEx } from '@ar-js-org/ar.js-threejs';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import cameraPara from "./assets/camera_para.dat?url";
import {type MarkerInfo, DebugMode, DenbaSettings} from './settings';
const width = 640*2;
const height = 480*2;
const baseMarkerBarcodeValue = 0;

const stats = DebugMode ? new Stats() : undefined;
if(stats){
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
}

class ArController{
    readonly renderer = new THREE.WebGLRenderer({
        antialias: true, alpha: true,
    });
    readonly clock: THREE.Clock = new THREE.Clock();
    readonly scene = new THREE.Scene();
    readonly markers : MarkerInfo = {};
    readonly baseMarkerRoot: THREE.Group = new THREE.Group();
    readonly raycaster = new THREE.Raycaster();
    readonly cursor = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshBasicMaterial({colorWrite: false, depthWrite: false})
    );
    private readonly arToolkitContext = new THREEx.ArToolkitContext({
        cameraParametersUrl: cameraPara,
        detectionMode:'mono_and_matrix',
        matrixCodeType:'3x3_PARITY65',
        debug: false,
    });
    tickFunc?: (markers:MarkerInfo, cursor:THREE.Vector2 ) => void;
    lastUpdate : number = 100000;

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

        const baseMarkerRoot = this.baseMarkerRoot;
        scene.add(baseMarkerRoot);

        const markerPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(DenbaSettings.L, DenbaSettings.L),
            new THREE.MeshBasicMaterial({colorWrite: false, depthWrite: false})
        );
        markerPlane.rotation.x = -Math.PI/2;
        baseMarkerRoot.add(markerPlane);
        baseMarkerRoot.add(this.cursor);
        
        const arToolkitSource = new THREEx.ArToolkitSource({
            sourceType: 'webcam',
            sourceWidth: width,
            sourceHeight: height,
        });
        arToolkitSource.init(
            () => {setTimeout(() => {onResize();}, 500);},
            () => {}
        );

        const arToolkitContext = this.arToolkitContext;
        arToolkitContext.init(() => {
            camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
        });

        new THREEx.ArMarkerControls(arToolkitContext, baseMarkerRoot, {
            type: 'barcode',
            barcodeValue: baseMarkerBarcodeValue,
            changeMatrixMode: 'modelViewMatrix',
        });

        let frame = 0;
        renderer.setAnimationLoop((() =>{
            renderer.render(scene, camera); 
            if (arToolkitSource.ready) {
                if(frame % 10 === 0) arToolkitContext.update(arToolkitSource.domElement);
                scene.visible = camera.visible;
                this.tick();
                frame++;
            }
        }));

        const onResize = () => {
            arToolkitSource.onResizeElement();
            arToolkitSource.copyElementSizeTo(canvas);
            if (arToolkitContext.arController) {
                arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
            }
        };
        window.addEventListener('resize', onResize);

        const onHandleMove = (event: MouseEvent|TouchEvent) => {
            const mouse = this.getRelativePos(event);
            this.raycaster.setFromCamera(mouse, camera);
            const intersects = this.raycaster.intersectObjects([markerPlane]);
            if(intersects.length > 0){
                const point = intersects[0].point;
                const posBase  = this.baseMarkerRoot.worldToLocal(point);
                this.cursor.position.copy(posBase);
            }
        };
        renderer.domElement.addEventListener('mousemove', onHandleMove);
        renderer.domElement.addEventListener('touchmove', onHandleMove);
}

    addMarker(barcodeStr: string, charge:number, object:THREE.Object3D){
        const root = new THREE.Group();
        new THREEx.ArMarkerControls(this.arToolkitContext, root, {
            type: 'barcode',
            barcodeValue: parseInt(barcodeStr),
            changeMatrixMode: 'modelViewMatrix',
        });
        root.add(object);
        this.scene.add(root);
        this.markers[barcodeStr] = {root, charge, object};
    }

    addPlot(...objects:THREE.Object3D[]){
        for(const object of objects){
            this.baseMarkerRoot.add(object);
        }
    }

    private tick(){
        stats?.begin();
        this.lastUpdate += this.clock.getDelta();
        if(this.lastUpdate > 0.5){
            for(const marker of Object.values(this.markers)){
                marker.xy = undefined;
                if(marker.root.visible){
                    const posWorld = marker.object.getWorldPosition(new THREE.Vector3());
                    const posBase  = this.baseMarkerRoot.worldToLocal(posWorld);
                    if(Math.abs(posBase.y)> 0){
                        marker.xy = new THREE.Vector2(posBase.x, posBase.z);
                        this.lastUpdate = 0;
                    }
                }
            }
        }
        const cursorPos = new THREE.Vector2(this.cursor.position.x, this.cursor.position.z);
        this.tickFunc?.(this.markers, cursorPos);
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