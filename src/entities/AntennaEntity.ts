import {Entity, Cartesian3, Color, ConstantPositionProperty, HeightReference} from "cesium";
import antenna from "../assets/antenna.glb";
console.log(antenna);

export class AntennaEntity {
    private entity: Entity;

    constructor(position: Cartesian3) {
        this.entity = new Entity({
            id: "antenna-entity",
            position: position,
            model: {
                uri: antenna,
                scale: 0.4,
                //minimumPixelSize: 64,
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