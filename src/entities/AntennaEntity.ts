import {Entity, Cartesian3, Color} from "cesium";
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
                scale: 2.0,
                minimumPixelSize: 64,
                maximumScale: 200,
            },
        })
    }

    getEntity(): Entity {
        return this.entity;
    }
}