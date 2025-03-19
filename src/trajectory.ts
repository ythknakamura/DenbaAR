import * as THREE from 'three';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {DenbaSettings, Colors} from "./settings";
import type {VE} from './settings';

type updateFunc = (x: number, y: number) => VE;
type meFunc = (x:number, y:number) => [kx:number, ky:number];

function modifiedEuler(x: number, y: number, f:meFunc): [number, number]{
    const alpha = 0.01;
    const beta = 10;
    for(let i=0; i<beta; i++){
        const [kx1, ky1] = f(x,y);
        const [kx2, ky2] = f(x+kx1*alpha, y+ky1*alpha);
        x += (kx1+kx2)*alpha/2;
        y += (ky1+ky2)*alpha/2;
    }
    return [x,y];
}
function dist2(x1:number, y1:number, x2:number, y2:number){
    return (x1-x2)**2 + (y1-y2)**2;
}
export class EFLine{
    private readonly LineF: Line2;
    private readonly LineB: Line2;
    private readonly LineFd: Line2;
    private readonly LineBd: Line2;
    private readonly clippingPlanes: THREE.Plane[] = new Array(6);
    readonly object = new THREE.Group();
    constructor(){
        this.LineF = new Line2(
            new LineGeometry(),
            new LineMaterial({
                color: Colors.EFLine,
                linewidth: 2,
                clippingPlanes: this.clippingPlanes 
            })
        );
        this.LineB = new Line2(
            new LineGeometry(),
            new LineMaterial({
                color: Colors.EFLine,
                linewidth: 2, 
                clippingPlanes: this.clippingPlanes})
        );
        this.LineFd = new Line2(
            new LineGeometry(),
            new LineMaterial({
                color: Colors.EFLine,
                linewidth: 1, 
                dashed:true, 
                dashSize: 0.05, 
                gapSize: 0.1, 
                clippingPlanes: this.clippingPlanes 
            })
        );
        this.LineBd = new Line2(
            new LineGeometry(),
            new LineMaterial({ 
                color: Colors.EFLine,
                linewidth: 1, 
                dashed:true, 
                dashSize: 0.05, 
                gapSize: 0.1, 
                clippingPlanes: this.clippingPlanes 
            })
        );
        this.object.add(this.LineF);
        this.object.add(this.LineB);
        this.object.add(this.LineFd);
        this.object.add(this.LineBd);
    }
    update(sx:number, sy:number, f:updateFunc, showDeni:boolean, cp:THREE.Plane[]){
        const VLimit =  DenbaSettings.VLimit
        const gamma = 9;
        const num = 512;
        const epsilon = 0.01;
        const arrayF = [];
        const arrayFd = [];
        let [xf,yf] = [sx, sy];
        for(let i=0; i<num; i++){
            arrayF.push(xf, 0, yf);
            arrayFd.push(xf, THREE.MathUtils.clamp(f(xf,yf).v,-VLimit, VLimit), yf);
            [xf, yf] = modifiedEuler(xf, yf,(x,y)=>{
                const {e, ex, ey} = f(x, y);
                return [ex/e, ey/e];
            });
            if(isNaN(xf) || isNaN(yf)) break;
            else if(dist2(xf, yf, sx, sy) > gamma*DenbaSettings.L**2) break;
            else if(i>num/5 && dist2(xf, yf, sx, sy) < epsilon) break;
        }
        const arrayB = [];
        const arrayBd = [];
        let [xb,yb] = [sx, sy];
        for(let i=0; i<num; i++){
            arrayB.push(xb, 0, yb);
            arrayBd.push(xb, THREE.MathUtils.clamp(f(xb,yb).v,-VLimit, VLimit), yb);
            [xb, yb] = modifiedEuler(xb, yb, (x,y)=>{
                const {e, ex, ey} = f(x, y);
                return [-ex/e, -ey/e];
            });
            if(isNaN(xb) || isNaN(yb)) break;
            else if(dist2(xb, yb, sx, sy) > gamma*DenbaSettings.L**2) break;
            else if(i>num/5 && dist2(xb, yb, sx, sy) < epsilon) break;
        }

        for(let i=0; i<cp.length; i++){
            this.clippingPlanes[i] = cp[i];
        }
        this.LineF.geometry.setPositions(arrayF);
        this.LineB.geometry.setPositions(arrayB);
        if(showDeni){
            this.LineFd.geometry.setPositions(arrayFd);
            this.LineBd.geometry.setPositions(arrayBd);
            this.LineFd.computeLineDistances();
            this.LineBd.computeLineDistances();
            this.LineFd.visible = true;
            this.LineBd.visible = true;
        }
        else{
            this.LineFd.visible = false;
            this.LineBd.visible = false;
        }
    }
}
export class Contour {
    private readonly LineR: Line2;
    private readonly LineL: Line2;
    private readonly LineRd: Line2;
    private readonly LineLd: Line2;
    private readonly clippingPlanes: THREE.Plane[] = new Array(6);
    readonly object = new THREE.Group();
    constructor(){
        this.LineR = new Line2(
            new LineGeometry(),
            new LineMaterial({
                color: Colors.Deni,
                linewidth: 2,
                clippingPlanes: this.clippingPlanes
            })
        );
        this.LineL = new Line2(
            new LineGeometry(),
            new LineMaterial({
                color: Colors.Deni,
                linewidth: 2,
                clippingPlanes: this.clippingPlanes
            })
        );
        this.LineRd = new Line2(
            new LineGeometry(),
            new LineMaterial({
                color: Colors.Deni,
                linewidth: 1, 
                dashed:true, 
                dashSize: 0.05, 
                gapSize: 0.1,
                clippingPlanes: this.clippingPlanes
            })
        );
        this.LineLd = new Line2(
            new LineGeometry(),
            new LineMaterial({
                color: Colors.Deni,
                linewidth: 1, 
                dashed:true, 
                dashSize: 0.05, 
                gapSize: 0.1,
                clippingPlanes: this.clippingPlanes
            })
        );
        this.object.add(this.LineR);
        this.object.add(this.LineL);
        this.object.add(this.LineRd);
        this.object.add(this.LineLd);
    }
    update(sx:number, sy:number, f:updateFunc, showDeni:boolean, cp:THREE.Plane[]){
        const gamma = 9;
        const num = 1024;
        const epsilon = 0.01;
        const arrayR = [];
        const arrayRd = [];
        let [xr,yr] = [sx, sy];
        for(let i=0; i<num; i++){
            arrayR.push(xr, 0, yr);
            arrayRd.push(xr, THREE.MathUtils.clamp(f(xr,yr).v,-DenbaSettings.VLimit, DenbaSettings.VLimit), yr);
            [xr, yr] = modifiedEuler(xr, yr, (x,y)=>{
                const {e, ex, ey} = f(x, y);
                return [-ey/e, ex/e];
            });
            if(isNaN(xr) || isNaN(yr)) break;
            else if(dist2(xr, yr, sx, sy) > gamma*DenbaSettings.L**2) break;
            else if(i>num/5 && dist2(xr, yr, sx, sy) < epsilon) break;
        }
        const arrayL = [];
        const arrayLd = [];
        let [xl,yl] = [sx, sy];
        for(let i=0; i<num; i++){
            arrayL.push(xl, 0, yl);
            arrayLd.push(xl, THREE.MathUtils.clamp(f(xl,yl).v,-DenbaSettings.VLimit, DenbaSettings.VLimit), yl);
            [xl, yl] = modifiedEuler(xl, yl, (x,y)=>{
                const {e, ex, ey} = f(x, y);
                return [ey/e, -ex/e];
            });
            if(isNaN(xl) || isNaN(yl)) break;
            if(dist2(xl, yl, sx, sy) > gamma * DenbaSettings.L ** 2) break;
            else if(i > num/5 && dist2(xl, yl, xr, yr) < epsilon) {
                i = Math.max(i, num - 5);
            }
            else if(i > num/5 && dist2(xl, yl, sx, sy) < epsilon) {
                i = Math.max(i, num - 5);
            }
        }
        for(let i=0; i<cp.length; i++){
            this.clippingPlanes[i] = cp[i];
        }
        this.LineR.geometry.setPositions(arrayR);
        this.LineL.geometry.setPositions(arrayL);
        if(showDeni){
            this.LineRd.geometry.setPositions(arrayRd);
            this.LineLd.geometry.setPositions(arrayLd);
            this.LineRd.computeLineDistances();
            this.LineLd.computeLineDistances();
            this.LineRd.visible = true;
            this.LineLd.visible = true;
        }
        else{
            this.LineRd.visible = false;
            this.LineLd.visible = false;
        }
    }
}