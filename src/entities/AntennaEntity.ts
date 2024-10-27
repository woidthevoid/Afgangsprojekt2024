import { BaseEntity } from "./BaseEntity";
//import qsantenna from "../assets/qsantenna.glb"
import { Cartesian3, ConstantPositionProperty, Entity, HeightReference } from "cesium";

export class AntennaEntity implements BaseEntity {
    public id: string;
    private entity: Entity;

    constructor(id: string, position: Cartesian3) {
        this.id = id;
        this.entity = new Entity({
            id: this.id,
            position: position,
            model: {
                uri: "../assets/qsantenna.glb",
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