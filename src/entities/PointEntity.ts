import { Cartesian2, Cartesian3, Color, DistanceDisplayCondition, Entity, HeightReference, LabelStyle, VerticalOrigin } from "cesium";
import { BaseEntity } from "./BaseEntity";

export class PointEntity implements BaseEntity {
    public id: string;
    private entity: any;

    constructor(id: string, position: any, color: any, pixelSize: number = 10) {
        this.id = id;
        if (!color) {
            color = Color.BLUE.withAlpha(0.4)
        }
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

    getEntity() {
        return this.entity;
    }
}