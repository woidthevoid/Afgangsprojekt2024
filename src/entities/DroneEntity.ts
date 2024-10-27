//import { Entity, Cartesian3, ReferenceProperty, Quaternion, ConstantProperty, JulianDate, Viewer, HeightReference } from "cesium";
//import qsdrone from "../assets/qsdrone.glb"
//import qspayload from "../assets/qspayload.glb"

export class DroneEntity {
    public id: string;
    public payloadId: string;
    private entity: any;
    private payload: any;
  
    constructor(viewer: any, id: string, position: any) {
      this.id = id;
      this.payloadId = "payload-entity-" + id
      // Drone entity
      this.entity = new Cesium.Entity({
        id: this.id,
        position: position,
        model: {
          //uri: qsdrone,
          uri: "../assets/qsdrone.glb",
          scale: 0.6,
          minimumPixelSize: 15,
          //maximumScale: 200,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
        },
      });
  
      // Add the drone entity to the viewer's EntityCollection
      viewer?.entities.add(this.entity);
  
      const entityPosition = this.entity.position?.getValue(Cesium.JulianDate.now());
  
      if (!entityPosition) {
        throw new Error("Drone position is undefined!");
      }
  
      // Payload entity with position referenced to the drone
      const positionReference = new Cesium.ReferenceProperty(
        viewer.entities, // EntityCollection that contains the drone entity
        this.entity.id, // TargetId
        ["position"] // TargetPropertyNames, specifying 'position' property
      );

      this.payload = new Cesium.Entity({
        id: this.payloadId,
        position: positionReference,
        model: {
          uri: "../assets/qspayload.glb",
          scale: 0.4,
          //minimumPixelSize: 32,
          //maximumScale: 100,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
        },
        orientation: Cesium.Quaternion.IDENTITY, // default orientation
      });
  
      // Add the payload entity to the viewer's EntityCollection
      viewer.entities.add(this.payload);
    }
  
    updatePayloadOrientation(newOrientation: any) {
      this.payload.orientation = new Cesium.ConstantProperty(newOrientation);
    }
  
    getEntity() {
      return this.entity;
    }
  
    getPayload() {
      return this.payload;
    }
}