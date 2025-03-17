import * as THREE from 'three';
import {ArCtrl} from './arController';
import { EArrow } from './eArrow';
import {Contour, EFLine} from './trajectory';
import { ChargePole } from './chargePole';
import {DenbaSettings, ViewModes, Colors, Cards} from "./settings";
import type {VE, PointData, MarkerInfo} from './settings';

class FieldPlotClass{
    private readonly pointData:PointData[] = [];
    private readonly arrowObject: THREE.Group;
    private readonly surfaceObject: THREE.Mesh;
    private readonly clippingPlanes: THREE.Plane[] = [];
    private readonly eArrow: EArrow;
    private readonly contour: Contour;
    private readonly efLine: EFLine;
    private readonly chargePole: ChargePole;
    private makeThinIfSmall = false;

    constructor(){
        const {L, N, VectorSkip, ArrowSize, VLimit} = DenbaSettings;
        const arrowSize = L/N*VectorSkip/3*ArrowSize;
        const positionBuffer: number[] = [];
        const colorBuffer: number[] = [];
        const face: number[] = [];

        // Markerの登録
        for(const [barcode, charge] of Object.entries(Cards)){
            const color  = charge > 0 ? Colors.Positive : Colors.Negative;
            const size = 0.1 + Math.abs(charge) * 0.1;
            const object = new THREE.Mesh(
                new THREE.SphereGeometry(size),
                new THREE.MeshLambertMaterial({color})
            );
            object.position.set(0, 0.5, -1);
            ArCtrl.addMarker(barcode, charge, object);
        }
        
        // ArrowとPointDataの初期化
        this.arrowObject = new THREE.Group();
        for (let i=0; i<=N; i++){
            for(let j=0; j<=N; j++){
                let arrow;
                const x = -L/2 + L*i/N;
                const y = -L/2 + L*j/N;
                const idx = i*(N+1) + j;
                positionBuffer.push(x, 0, y);
                colorBuffer.push(0, 0, 0);
                if(i < N && j < N){
                    face.push(idx, idx+1, idx+N+2);
                    face.push(idx, idx+N+2, idx+N+1);
                }
                if(i%VectorSkip === 0 && j%VectorSkip === 0){
                    const arrowGeo = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(-arrowSize, 0, arrowSize/2),
                        new THREE.Vector3(2*arrowSize, 0, 0),
                        new THREE.Vector3(-arrowSize, 0, -arrowSize/2)
                    ]);
                    const arrowMat = new THREE.MeshBasicMaterial({
                        transparent: true,
                        color: Colors.Denba,
                    });
                    arrow = new THREE.Mesh(arrowGeo, arrowMat);
                    arrow.position.set(x, -0.01, y);
                    this.arrowObject.add(arrow);
                }
                this.pointData.push({idx, x, y, arrow});
            }
        }

        // Surfaceの初期化
        const surfaceGeo = new THREE.BufferGeometry();
        surfaceGeo.setAttribute('position', new THREE.Float32BufferAttribute(positionBuffer,3));
        surfaceGeo.setAttribute('color', new THREE.Float32BufferAttribute(colorBuffer,3));
        surfaceGeo.setIndex(face);
        const surfaceMat = new THREE.MeshLambertMaterial({
            vertexColors: true,
            opacity: 0.5,
            wireframe: DenbaSettings.WireFrame,
            transparent: true,
            clippingPlanes: this.clippingPlanes,
            side: THREE.DoubleSide,
        });
        this.surfaceObject = new THREE.Mesh(surfaceGeo, surfaceMat);
        this.surfaceObject.position.setY(VLimit);

        //Surfaceの補助平面の追加
        const surfaceArea = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(L, VLimit, L)),
            new THREE.LineBasicMaterial()
        );
        surfaceArea.position.setY(-VLimit/2);
        this.surfaceObject.add(surfaceArea);

        // ChargePoleの初期化
        this.chargePole = new ChargePole();
        this.surfaceObject.add(this.chargePole.object)

        // Arrowの補助平面の追加
        const arrowArea = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.PlaneGeometry(L, L)),
            new THREE.LineBasicMaterial()
        );
        arrowArea.rotateX(-Math.PI/2);
        this.arrowObject.add(arrowArea);

        // その他の初期化
        this.eArrow = new EArrow();
        this.contour = new Contour();
        this.efLine = new EFLine();

        ArCtrl.addPlot(
            this.arrowObject, 
            this.surfaceObject, 
            this.eArrow.object,
            this.contour.object,
            this.efLine.object,
        );
    }

    calcValues(markers:MarkerInfo, cursor:THREE.Vector2){
        const position = this.surfaceObject.geometry.attributes.position;
        const color = this.surfaceObject.geometry.attributes.color;
        for (const { idx, x, y, arrow } of this.pointData) {
            const { v, e, ex, ey } = this.getVE(x, y, markers);
            if (this.surfaceObject.visible) {
                const [r, g, b] = this.getVColor(v);
                position.setY(idx, v);
                color.setXYZ(idx, r, g, b);
                color.needsUpdate = true;
                position.needsUpdate = true;
            }
            if (arrow && this.arrowObject.visible) {
                arrow.rotation.y = -Math.atan2(ey, ex);
                (arrow.material as THREE.Material).opacity = this.makeThinIfSmall ? 
                    (e < 0.001 ? 0 : 0.9) : 
                    Math.tanh(2 * e);
            }
        }
        this.surfaceObject.geometry.computeVertexNormals();

        const iyc = [[0, -1, DenbaSettings.VLimit], [1, 1, DenbaSettings.VLimit]];
        for(const [i,y,c] of iyc){
            const plane = new THREE.Plane(new THREE.Vector3(0, y, 0), c);
            plane.applyMatrix4(this.surfaceObject.matrixWorld);
            this.clippingPlanes[i] = plane;
        }

        const { e, ex, ey } = this.getVE(cursor.x, cursor.y, markers);
        this.eArrow.update(cursor.x, cursor.y, THREE.MathUtils.clamp(e, 0.1, 4), Math.atan2(ey, ex));
        this.contour.update(cursor.x, cursor.y, (x: number, y: number) => this.getVE(x, y, markers));
        this.efLine.update(cursor.x, cursor.y, (x: number, y: number) => this.getVE(x, y, markers));
        this.chargePole.update(markers);
    }

    setViewMode(mode: typeof ViewModes[number]) {
        switch(mode){
            case  "電場を描画（向きと大きさ）":
                this.arrowObject.visible = true;
                this.surfaceObject.visible = false;
                this.makeThinIfSmall = false;
                break;
            case "電場を描画（向きのみ）":
                this.arrowObject.visible = true;
                this.surfaceObject.visible = false;
                this.makeThinIfSmall = true;
                break;
            case "電位を描画（通常）":
                this.arrowObject.visible = false;
                this.surfaceObject.visible = true;
                this.makeThinIfSmall = false;
                break;
            case "電位を描画（正負を強調）":
                this.arrowObject.visible = false;
                this.surfaceObject.visible = true;
                this.makeThinIfSmall = true;
                break;
        }
    }
    setCursorMode(showEArrow: boolean, showEFLine: boolean, showContour: boolean){
        this.eArrow.object.visible = showEArrow;
        this.efLine.object.visible = showEFLine;
        this.contour.object.visible = showContour;
    } 

    private getVE(x:number, y:number, markers:MarkerInfo):VE{
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

    private getVColor(val: number) {
        const coo = this.makeThinIfSmall ? 25 : 5;
        const vv = Math.tanh(val / DenbaSettings.VLimit* coo);
        const r =  vv > 0 ?  vv: 0;
        const b =  vv < 0 ? -vv: 0;
        const g = 1 - r - b;
        return [r+g, g, b+g];
    }
}

export const FieldPlot = new FieldPlotClass();