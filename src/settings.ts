import * as THREE from 'three';

export const DebugMode = false;

export const DenbaSettings = {
    K: 1,
    L: 15,
    VLimit: 4,
    N: 48,
    VectorSkip: 2,
    ArrowSize: 0.75,
} as const;

export const ARSettings={
    LeapAlpha: 1/16,
    MarkerLife:30,
    FrameSkip:3,
    MarkerUpdateInterval:0.1
} as const;

export const Colors = {
    Positive: "#E11345",
    Negative: "#3232ff",
    Denba: "#00BF62",
    Deni: "#ee7800",
    EFLine: "#800080",
    EArrow: "#ddff00",
} as const;

export type VE = {
    v: number;
    e: number;
    ex: number;
    ey: number;
};
    
export type PointData = {
    idx: number;
    x: number;
    y: number;
    arrow?: THREE.Mesh;
};
export type VEArray = (VE & {x:number, y:number})[];

export type MarkerInfo = {
    charge: number,
    xy: THREE.Vector2,
};

export const Cards: Record<string, number> = {
    1: 1,
    2: 1,
    3: 1,
    4: -1,
    5: -1,
    6: 2,
    7: -2,
    8: 3,
    9: -3,
    10: 4,
    11: -4,
} as const;

export const ViewModes = [
    "電場を描画（向きと大きさ）", 
    "電場を描画（向きのみ）", 
    "電位を描画（通常）", 
    "電位を描画（正負を強調）"
] as const;

export const CursorModes = [
    "電場ベクトル", 
    "電気力線", 
    "等電位線"
] as const;

export function ij2idx(i:number, j:number){
    return j * (DenbaSettings.N + 1) + i;
}
export function ij2xy(i:number, j:number){
    const x = -DenbaSettings.L/2 + DenbaSettings.L * i / DenbaSettings.N;
    const y = -DenbaSettings.L/2 + DenbaSettings.L * j / DenbaSettings.N;
    return { x, y };
}