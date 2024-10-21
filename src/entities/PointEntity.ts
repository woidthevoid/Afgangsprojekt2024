import { Cartesian2, Cartesian3, Color, DistanceDisplayCondition, Entity, HeightReference, LabelStyle, VerticalOrigin } from "cesium";
import { BaseEntity } from "./BaseEntity";

export class PointEntity implements BaseEntity {
    public id: string;
    private entity: Entity;

    constructor(id: string, position: Cartesian3, color: Color = Color.BLUE.withAlpha(0.4), pixelSize: number = 10) {
        this.id = id;

        this.entity = new Entity({
            id: this.id,
            position: position,
            point: {
                pixelSize: pixelSize,
                color: color,
                outlineColor: Color.WHITE,
                outlineWidth: 2,
                heightReference: HeightReference.RELATIVE_TO_GROUND,
                distanceDisplayCondition: new DistanceDisplayCondition(0, 10000)
            },
            /* label: {
                text: `Point: ${this.id}`,
                font: '12pt sans-serif',
                style: LabelStyle.FILL_AND_OUTLINE,
                fillColor: Color.YELLOW,
                outlineColor: Color.BLACK,
                verticalOrigin: VerticalOrigin.BOTTOM,
                pixelOffset: new Cartesian2(0, -15),
                heightReference: HeightReference.RELATIVE_TO_GROUND,
                distanceDisplayCondition: new DistanceDisplayCondition(0, 10000)
            } */
        });
    }

    getEntity(): Entity {
        return this.entity;
    }
}