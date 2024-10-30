import { BaseEntity } from "./BaseEntity";
import { Cartesian3, ConstantPositionProperty, Entity, HeightReference, Math as CesiumMath, HeadingPitchRoll, Transforms } from "cesium";
import qsantenna from "../assets/qsantenna.glb"

export class AntennaEntity implements BaseEntity {
    public id: string;
    private entity: Entity;

    constructor(id: string, position: Cartesian3, heading: number = 0, pitch: number = 0, roll: number = 0) {
        this.id = id;
        const headingR = CesiumMath.toRadians(heading); // 0 = facing north
        const pitchR = CesiumMath.toRadians(pitch); // y axis
        const rollR = CesiumMath.toRadians(roll); // x axis
        const hpr = new HeadingPitchRoll(headingR, pitchR, rollR);
        const orientation = Transforms.headingPitchRollQuaternion(position, hpr);

        this.entity = new Entity({
            id: this.id,
            position: position,
            orientation: orientation,
            model: {
                //uri: "qrc:/map3d/LiveMap3D/assets/qsantenna.glb",
                uri: qsantenna,
                scale: 0.8,
                minimumPixelSize: 25,
                //maximumScale: 200,
                heightReference: HeightReference.CLAMP_TO_TERRAIN
            },
        })
    }

    getEntity(): Entity {
        return this.entity;
    }

    setPos(pos: Cartesian3) {
        this.entity.position = new ConstantPositionProperty(pos)
    }
}