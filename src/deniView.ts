import * as THREE from 'three';
//import *  as SceneUtils from 'three/examples/jsm/utils/SceneUtils.js';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import { Colors, DenbaSettings, ij2idx, ij2xy} from './settings';
import type {VEArray, MarkerInfo} from './settings';

export class DeniView{
    readonly object : THREE.Group = new THREE.Group();
    private surfaceObject : THREE.Mesh;
    private position : THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
    private color : THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
    private readonly poles :{[barcode:string]: Line2} = {};
    private readonly clippingPlanes: THREE.Plane[] = new Array(2);
    poleInitialized: boolean = false;

    constructor(){
        const {N} = DenbaSettings;
        const positionBuffer: number[] = [];
        const colorBuffer: number[] = [];
        const face: number[] = [];

        for (let i=0; i<=N; i++){
            for(let j=0; j<=N; j++){
                const idx = ij2idx(i, j);
                const { x, y } = ij2xy(i, j);
                positionBuffer.push(x, 0, y);
                colorBuffer.push(0, 0, 0);
                if(i < N && j < N){
                    face.push(idx, idx+1, idx+N+2);
                    face.push(idx, idx+N+2, idx+N+1);
                }
            }
        }

        const surfaceGeo = new THREE.BufferGeometry();
        surfaceGeo.setAttribute('position', 
            new THREE.Float32BufferAttribute(positionBuffer,3));
        surfaceGeo.setAttribute('color', 
            new THREE.Float32BufferAttribute(colorBuffer,3));
        surfaceGeo.setIndex(face);

        const surfaceMat = new THREE.MeshLambertMaterial({
            vertexColors: true,
            opacity: 0.5,
            transparent: true,
            side: THREE.DoubleSide,
            clippingPlanes: this.clippingPlanes,
            clipShadows: true,
        });
        this.surfaceObject = new THREE.Mesh(surfaceGeo, surfaceMat);
        this.object.add(this.surfaceObject);

        const wireframe = new THREE.Mesh(
            surfaceGeo, 
            new THREE.MeshBasicMaterial({
                wireframe:true,
                transparent:true,
                opacity:0.1,
                clippingPlanes: this.clippingPlanes,
            })
        );
        this.object.add(wireframe);

        this.position = surfaceGeo.attributes.position;
        this.color = surfaceGeo.attributes.color;
    }
    
    update(veArray:VEArray, makeThinIfSmall:boolean, makers:MarkerInfo, cp:THREE.Plane[]){
        const {N, VLimit} =  DenbaSettings;
        if(!this.poleInitialized) this.initPole(makers);
        for(const [barcode, {xy}] of Object.entries(makers)){
            const pole = this.poles[barcode];
            if(xy){
                pole.position.setX(xy.x);
                pole.position.setZ(xy.y);
                pole.visible = true;
            }
            else{
                pole.visible = false;
            }
        }
        for(let i=0; i<=N; i++){
            for(let j=0; j<=N; j++){
                const idx = ij2idx(i, j);
                const { v } = veArray[idx];
                const [r, g, b] = this.getVColor(v, makeThinIfSmall);
                this.position.setY(idx, v);
                this.color.setXYZ(idx, r, g, b);
            }
        }
        this.clippingPlanes[0] = cp[0];
        this.clippingPlanes[1] = cp[1];
        this.position.needsUpdate = true;
        this.color.needsUpdate = true;
        this.surfaceObject.geometry.computeVertexNormals();
    }

    private getVColor(val: number, makeThinIfSmall:boolean): number[]{
        const coo = makeThinIfSmall ? 25 : 5;
        const vv = Math.tanh(val / DenbaSettings.VLimit * coo);
        const r =  vv > 0 ?  vv: 0;
        const b =  vv < 0 ? -vv: 0;
        const g = 1 - r - b;
        return [r+g, g, b+g];
    }

    private initPole(makers:MarkerInfo) {
        for(const [barcode, {charge}] of Object.entries(makers)){
            const pole = new Line2(
                new LineGeometry(),
                new LineMaterial({
                    linewidth:3, 
                    dashed:true,
                    dashSize:0.2,
                    gapSize:0.2,
                    color: charge > 0 ? Colors.Positive : Colors.Negative})
            );
            pole.geometry.setPositions([
                0, 0, 0, 
                0, charge > 0 ? DenbaSettings.VLimit:-DenbaSettings.VLimit, 0]);  
            pole.computeLineDistances();
            this.object.add(pole);
            this.poles[barcode] = pole;
        }
        this.poleInitialized = true;
    }
}