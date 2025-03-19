import * as THREE from 'three';
import {ArCtrl} from './arController';
import { DenbaView } from './denbaView';
import { DeniView } from './deniView';
import { EArrow } from './eArrow';
import {Contour, EFLine} from './trajectory';
import {DenbaSettings, ViewModes, Colors, Cards, ij2xy} from "./settings";
import type {VE, MarkerInfo, VEArray} from './settings';

class FieldPlotClass{
    private readonly veArray: VEArray;
    private readonly arObject: THREE.Group;
    private readonly clippingPlanes: THREE.Plane[];
    private readonly denbaView: DenbaView;
    private readonly deniView: DeniView;
    private readonly eArrow: EArrow;
    private readonly contour: Contour;
    private readonly efLine: EFLine;
    private makeThinIfSmall = false;

    constructor(){
        // Markerの登録
        for(const [barcode, charge] of Object.entries(Cards)){
            const color  = charge > 0 ? Colors.Positive : Colors.Negative;
            const size = 0.1 + Math.abs(charge) * 0.1;
            const object = new THREE.Mesh(
                new THREE.SphereGeometry(size),
                new THREE.MeshLambertMaterial({color})
            );
            object.position.set(0, 0, -1);
            ArCtrl.addMarker(barcode, charge, object);
        }
        
        this.veArray = [];
        for (let i=0; i<=DenbaSettings.N; i++){
            for(let j=0; j<=DenbaSettings.N; j++){
                const {x,y} = ij2xy(i, j);
                this.veArray.push({v:0, e:0, ex:0, ey:0, x, y});
            }
        }

        this.clippingPlanes = new Array(6);

        this.denbaView = new DenbaView();
        this.deniView = new DeniView();
        this.eArrow = new EArrow();
        this.contour = new Contour();
        this.efLine = new EFLine();
        
        this.arObject = new THREE.Group();
        this.arObject.add(this.denbaView.object);
        this.arObject.add(this.deniView.object);
        this.arObject.add(this.eArrow.object);
        this.arObject.add(this.contour.object);
        this.arObject.add(this.efLine.object);
        ArCtrl.addPlot(this.arObject);
    }

    calcValues(markers:MarkerInfo, cursor:THREE.Vector2){
        for(let idx=0; idx<this.veArray.length; idx++){
            const vea = this.veArray[idx];
            const {x,y} = vea;
            const { v, e, ex, ey} = this.calcVE(x, y, markers);
            vea.v = v;
            vea.e = e;
            vea.ex = ex;
            vea.ey = ey;
        }

        const {VLimit, L} = DenbaSettings;
        const xyzc = [[0,-1,0,VLimit],[0,1,0,VLimit],[1,0,0,L/2],[-1,0,0,L/2],[0,0,1,L/2],[0,0,-1,L/2]];
        for(let i=0; i<xyzc.length; i++){
            const [x, y, z, c] = xyzc[i];
            const plane = new THREE.Plane(new THREE.Vector3(x, y, z), c);
            plane.applyMatrix4(this.arObject.matrixWorld);
            this.clippingPlanes[i] = plane;
        }

        const { e: ce, ex: cex, ey: cey } = this.calcVE(cursor.x, cursor.y, markers);
        const showDeni = this.deniView.object.visible;
        const updateFunc = (x: number, y: number) => this.calcVE(x, y, markers);
        if(showDeni){
            this.deniView.update(this.veArray, this.makeThinIfSmall, markers, this.clippingPlanes);
        }
        else{
            this.denbaView.update(this.veArray, this.makeThinIfSmall);
        }
        this.eArrow.update(cursor.x, cursor.y, THREE.MathUtils.clamp(ce, 0.1, 4), Math.atan2(cey, cex));
        this.contour.update(cursor.x, cursor.y, updateFunc, showDeni, this.clippingPlanes);
        this.efLine.update( cursor.x, cursor.y, updateFunc, showDeni, this.clippingPlanes);
    }

    setViewMode(mode: typeof ViewModes[number]) {
        switch(mode){
            case  "電場を描画（向きと大きさ）":
                this.denbaView.object.visible = true;
                this.deniView.object.visible = false;
                this.makeThinIfSmall = false;
                break;
            case "電場を描画（向きのみ）":
                this.denbaView.object.visible = true;
                this.deniView.object.visible = false;
                this.makeThinIfSmall = true;
                break;
            case "電位を描画（通常）":
                this.denbaView.object.visible = false;
                this.deniView.object.visible = true;
                this.makeThinIfSmall = false;
                break;
            case "電位を描画（正負を強調）":
                this.denbaView.object.visible = false;
                this.deniView.object.visible = true;
                this.makeThinIfSmall = true;
                break;
        }
    }
    setCursorMode(showEArrow: boolean, showEFLine: boolean, showContour: boolean){
        this.eArrow.object.visible = showEArrow;
        this.efLine.object.visible = showEFLine;
        this.contour.object.visible = showContour;
    } 

    private calcVE(x:number, y:number, markers:MarkerInfo):VE{
        let [v, ex, ey] = [0, 0, 0];
        for(const marker of Object.values(markers)){
            if(marker.xy){
                const mx = marker.xy.x;
                const my = marker.xy.y;
                const r = Math.sqrt((x-mx)**2 + (y-my)**2);
                const coo = DenbaSettings.K * marker.charge;
                v += coo/r;
                ex += coo*(x-mx)/(r**3);
                ey += coo*(y-my)/(r**3);
            }
        }
        const e = Math.sqrt(ex ** 2 + ey ** 2);
        v = THREE.MathUtils.clamp(v, -DenbaSettings.VLimit*1.5, DenbaSettings.VLimit*1.5);
        return { v, e, ex, ey };
    }
}

export const FieldPlot = new FieldPlotClass();