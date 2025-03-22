import * as THREE from 'three';
import {Colors, Cards, ARSettings} from "./settings";
import type {MarkerInfo} from './settings';

type MarkerData = {
    barcodeValue: number,
    root: THREE.Group<THREE.Object3DEventMap>,
    object: THREE.Object3D,
    pos:THREE.Vector3,
    charge: number,
    life:number,
};

export class MarkerCradle{
    private readonly originRoot =  new THREE.Group();
    private originLife = ARSettings.MarkerLife;
    private readonly viOrigin= new THREE.Object3D();
    originSurvived = false;
    private readonly markers : MarkerData[] = [];

    constructor(){
        for(const [barcode, charge] of Object.entries(Cards)){
            const barcodeValue = parseInt(barcode);
            const color  = charge > 0 ? Colors.Positive : Colors.Negative;
            const size = 0.1 + Math.abs(charge) * 0.1;
            const object = new THREE.Mesh(
                new THREE.SphereGeometry(size),
                new THREE.MeshLambertMaterial({color})
            );
            object.position.set(0, 0, -1);
            const root = new THREE.Group();
            root.add(object);
            const marker: MarkerData = {
                root, object, charge,
                barcodeValue,
                life: ARSettings.MarkerLife,
                pos: new THREE.Vector3(), 
            };
            this.markers.push(marker);
        }
    }
    getViOrigin(){
        return this.viOrigin;
    }

    getMarkerRoots():{barcodeValue:number,root:THREE.Object3D}[]{
        const roots:{barcodeValue:number,root:THREE.Object3D}[] = [];
        roots.push({barcodeValue: 0, root: this.originRoot});
        for(const marker of this.markers){
            roots.push({...marker});
        }
        return roots;
    }

    getMarkerInfos():MarkerInfo[]{
        //originMakerの確認
        if(this.originRoot.visible) this.originLife = ARSettings.MarkerLife;
        else                        this.originLife--;
        
        this.originSurvived = this.originLife > 0;
        if(this.originRoot.visible){
            const pos = this.originRoot.getWorldPosition(new THREE.Vector3());
            const quat = this.originRoot.getWorldQuaternion(new THREE.Quaternion());
            const {x:px, y:py, z:pz} = this.viOrigin.position.lerp(pos, ARSettings.LeapAlpha);
            const {x:qx, y:qy, z:qz, w:qw} = this.viOrigin.quaternion.slerp(quat, ARSettings.LeapAlpha);
            this.viOrigin.position.set(px, py, pz);
            this.viOrigin.quaternion.set(qx, qy, qz, qw);
        }

        //markerの確認
        const markerInfos:MarkerInfo[] = [];
        if(this.originLife > 0){
            for (const marker of this.markers) {
                if(marker.root.visible) marker.life = ARSettings.MarkerLife;
                else                    marker.life--;
                
                if(marker.root.visible){
                    const pos = marker.object.getWorldPosition(new THREE.Vector3());
                    const {x,y,z} = marker.pos.lerp(this.getOriginPos(pos), ARSettings.LeapAlpha);
                    marker.pos.set(x, y, z);
                }
                if(marker.life > 0){
                    markerInfos.push({
                        charge: marker.charge,
                        xy: new THREE.Vector2(marker.pos.x, marker.pos.z),
                    });
                }
            }
        }
        return markerInfos;
    }

    getOriginPos(target:THREE.Vector3){
        return this.viOrigin.worldToLocal(target);
    }


}
