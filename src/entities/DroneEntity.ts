import { Entity, Cartesian3, Color, ModelGraphics } from "cesium";
import drone from "../assets/drone.glb";
console.log(drone);

export class DroneEntity {
  private entity: Entity;

  constructor(position: Cartesian3) {
    this.entity = new Entity({
      id: "drone-entity",
      position: position,
      model: {
        uri: drone, // Path to your glTF file
        scale: 1.0, // Adjust the scale as needed
        minimumPixelSize: 64, // Minimum size in pixels to render the model
        maximumScale: 200, // Optional: cap the scaling to avoid the model being too large
      },
      point: {
        pixelSize: 10,
        color: Color.RED,
      },
    });
  }

  getEntity(): Entity {
    return this.entity;
  }
}
