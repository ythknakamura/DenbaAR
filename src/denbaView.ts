import * as THREE from 'three';
import { Colors, DenbaSettings, ij2idx, ij2xy , type VEArray} from './settings';

export class DenbaView{
    private readonly arrows: [number, THREE.Mesh][] = [];
    readonly object: THREE.Group = new THREE.Group();
    constructor(){
        const {L, N, VectorSkip, ArrowSize} = DenbaSettings;
        const arrowSize = L/N*VectorSkip/3*ArrowSize;
        this.object = new THREE.Group();
        for (let i=0; i<=N; i+=VectorSkip){
            for(let j=0; j<=N; j+=VectorSkip){
                const idx = ij2idx(i,j);
                const { x, y } = ij2xy(i, j);
                const arrowGeo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(-arrowSize, 0, arrowSize/2),
                    new THREE.Vector3(2*arrowSize, 0, 0),
                    new THREE.Vector3(-arrowSize, 0, -arrowSize/2)
                ]);
                const arrowMat = new THREE.MeshBasicMaterial({
                    transparent: true,
                    color: Colors.Denba,
                });
                const arrow = new THREE.Mesh(arrowGeo, arrowMat);
                arrow.position.set(y, -0.01, x);
                this.arrows.push([idx, arrow]);
                this.object.add(arrow);
            }
        }
        // Arrowの補助平面の追加
        const arrowArea = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.PlaneGeometry(L, L)),
            new THREE.LineBasicMaterial()
        );
        arrowArea.rotateX(-Math.PI/2);
        this.object.add(arrowArea);
    }

    update(veArray:VEArray, makeThinIfSmall:boolean){
        for(const [idx, arrow] of this.arrows){
            const {e, ex, ey} = veArray[idx];
            arrow.rotation.y = -Math.atan2(ey, ex);
            (arrow.material as THREE.Material).opacity = 
                makeThinIfSmall ? (e < 0.001 ? 0 : 0.9) : Math.tanh(2 * e);
        }
    }
}