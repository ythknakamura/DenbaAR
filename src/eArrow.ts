import * as THREE from 'three';
import { Colors } from './settings';

export class EArrow{
    private readonly tail: THREE.Mesh;
    private readonly head: THREE.Mesh;
    private readonly body: THREE.Mesh;
    readonly object: THREE.Group = new THREE.Group();
    constructor(){
        this.object.position.set(0, 0.05, 0);
        const color = Colors.EArrow;
        const tailGeometry = new THREE.PlaneGeometry(0.2,0.2);
        tailGeometry.rotateX(-Math.PI/2);
        const headGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0.3, 0.05, 0),
            new THREE.Vector3(0, 0.05, -0.2),
            new THREE.Vector3(0, 0.05, 0.2),
        ]);
        const bodyGeometry = new THREE.PlaneGeometry(1,0.1);
        bodyGeometry.rotateX(-Math.PI/2);
        this.head = new THREE.Mesh(headGeometry, new THREE.MeshBasicMaterial({color}));
        this.tail = new THREE.Mesh(tailGeometry, new THREE.MeshBasicMaterial({color}));
        this.body = new THREE.Mesh(bodyGeometry, new THREE.MeshBasicMaterial({color}));

        this.object.add(this.tail);
        this.object.add(this.head);
        this.object.add(this.body);
    }

    update(x:number, y:number, length:number, angle:number){
        this.head.position.setX(length);
        this.body.scale.setX(length);
        this.body.position.setX(length/2);
        this.object.position.set(x, 0.1, y);
        this.object.rotation.y = -angle;
    }

    public show(tail:boolean, arrow:boolean){
        this.tail.visible = tail || arrow;
        this.head.visible = arrow;
        this.body.visible = arrow;
    }
}