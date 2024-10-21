import {Entity, Cartesian3, Color, ConstantPositionProperty, HeightReference, LabelStyle, VerticalOrigin, Cartesian2} from "cesium";
import { BaseEntity } from "./BaseEntity";
import antenna from "../assets/antenna.glb";

export class AntennaEntity implements BaseEntity {
    public id: string;
    private entity: Entity;

    constructor(id: string, position: Cartesian3) {
        this.id = id;
        this.entity = new Entity({
            id: this.id,
            position: position,
            model: {
                uri: antenna,
                scale: 0.4,
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