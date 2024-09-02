import { Entity, Cartesian3, Color, ModelGraphics } from "cesium";

export class DroneEntity {
    private entity: Entity;

    constructor(position: Cartesian3) {
        this.entity = new Entity({
            id: 'drone-entity',
            position: position,
            point: {
                pixelSize: 10,
                color: Color.RED
            }
        });
    }

    getEntity(): Entity {
        return this.entity;
    }
}