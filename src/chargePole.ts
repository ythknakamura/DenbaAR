import * as THREE from 'three';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {type MarkerInfo, DenbaSettings, Colors} from './settings';

export class ChargePole{
    readonly object: THREE.Group = new THREE.Group();
    private readonly poles :{[barcode:string]: Line2} = {};
    initialized: boolean = false;

    private init(makers:MarkerInfo) {
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
            pole.geometry.setPositions([0, -DenbaSettings.VLimit, 0, 0, DenbaSettings.VLimit, 0]);  
            pole.position.setY(-DenbaSettings.VLimit);
            pole.computeLineDistances();
            this.object.add(pole);
            this.poles[barcode] = pole;
        }
        
        this.initialized = true;
    }
    update(makers:MarkerInfo) {
        if(!this.initialized) this.init(makers);
        for(const [barcode, {xy}] of Object.entries(makers)){
            const pole = this.poles[barcode];
            if(xy){
                pole.position.set(xy!.x, 0, xy!.y);
                pole.visible = true;
            }
            else{
                pole.visible = false;
            }
        }
    }
}