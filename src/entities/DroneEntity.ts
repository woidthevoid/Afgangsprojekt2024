import { Entity, Cartesian3, ReferenceProperty, Quaternion, ConstantProperty, JulianDate, Viewer, HeightReference } from "cesium";
//import drone from "../assets/testdrone.glb"
//import payload from "../assets/camera2.glb"

export class DroneEntity {
    public id: string;
    public payloadId: string;
    private entity: Entity;
    private payload: Entity;
  
    constructor(viewer: Viewer, id: string, position: Cartesian3) {
      this.id = id;
      this.payloadId = "payload-entity-" + id
      // Drone entity
      this.entity = new Entity({
        id: this.id,
        position: position,
        model: {
          uri: "qrc:/map/LiveMap/assets/drone.glb",
          //uri: drone,
          scale: 0.6,
          minimumPixelSize: 15,
          //maximumScale: 200,
          //heightReference: HeightReference.RELATIVE_TO_GROUND
        },
      });
  
      // Add the drone entity to the viewer's EntityCollection
      viewer?.entities.add(this.entity);
  
      const entityPosition = this.entity.position?.getValue(JulianDate.now());
  
      if (!entityPosition) {
        throw new Error("Drone position is undefined!");
      }
  
      // Payload entity with position referenced to the drone
      const positionReference = new ReferenceProperty(
        viewer.entities, // EntityCollection that contains the drone entity
        this.entity.id, // TargetId
        ["position"] // TargetPropertyNames, specifying 'position' property
      );

      this.payload = new Entity({
        id: this.payloadId,
        position: positionReference,
        model: {
          uri: "qrc:/map/LiveMap/assets/payload.glb",
          //uri: payload,
          scale: 0.8,
          minimumPixelSize: 32,
          //maximumScale: 100,
          //heightReference: HeightReference.RELATIVE_TO_GROUND
        },
        orientation: Quaternion.IDENTITY, // default orientation
      });
  
      // Add the payload entity to the viewer's EntityCollection
      viewer.entities.add(this.payload);
    }
  
    updatePayloadOrientation(newOrientation: Quaternion) {
      this.payload.orientation = new ConstantProperty(newOrientation);
    }
  
    getEntity() {
      return this.entity;
    }
  
    getPayload() {
      return this.payload;
    }
}