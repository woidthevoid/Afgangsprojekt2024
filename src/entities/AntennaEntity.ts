import {Entity, Cartesian3, Color, ConstantPositionProperty, HeightReference, LabelStyle, VerticalOrigin, Cartesian2} from "cesium";
import { BaseEntity } from "./BaseEntity";
import antenna from "../assets/antenna.glb";
import qsantenna from "../assets/qsantenna.glb"

export class AntennaEntity implements BaseEntity {
    public id: string;
    private entity: Entity;

    constructor(id: string, position: Cartesian3) {
        this.id = id;
        this.entity = new Entity({
            id: this.id,
            position: position,
            model: {
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