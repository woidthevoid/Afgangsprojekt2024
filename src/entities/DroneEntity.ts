import { Entity, Cartesian3, Color, ModelGraphics, SampledPositionProperty, JulianDate, PathGraphics } from "cesium";
import drone from "../assets/drone.glb";
console.log(drone);

export class DroneEntity {
  private entity: Entity;

  constructor(position: Cartesian3) {
    this.entity = new Entity({
      id: "drone-entity",
      position: position,
      model: {
        uri: drone, 
        scale: 1.0, 
        minimumPixelSize: 64, 
        maximumScale: 200, 
      },
      point: {
        pixelSize: 10,
        color: Color.RED,
      },
      path: new PathGraphics({
        width: 2,
        material: Color.RED,
      }),
    });
  }

  getEntity(): Entity {
    return this.entity;
  }
}
