import { Entity, Cartesian3, ReferenceProperty, Quaternion, ConstantProperty, JulianDate, Viewer, HeightReference } from "cesium";
import drone from "../assets/drone.glb";
import drone2 from "../assets/drone2.glb"
import dronepayload from "../assets/dronepayload.glb"
import dronepayload2 from "../assets/dronepayload2.glb"
import antenna from "../assets/antenna.glb"
import camera from "../assets/camera.glb"

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
          uri: drone2,
          scale: 0.1,
          minimumPixelSize: 15,
          //maximumScale: 200,
          heightReference: HeightReference.RELATIVE_TO_GROUND
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
          uri: camera,
          scale: 8,
          //minimumPixelSize: 32,
          //maximumScale: 100,
          heightReference: HeightReference.RELATIVE_TO_GROUND
        },
        orientation: Quaternion.IDENTITY, // default orientation
      });
  
      // Add the payload entity to the viewer's EntityCollection
      viewer.entities.add(this.payload);
    }
  
    updatePayloadOrientation(newOrientation: Quaternion) {
      this.payload.orientation = new ConstantProperty(newOrientation);
    }
  
    getEntity(): Entity {
      return this.entity;
    }
  
    getPayload(): Entity {
      return this.payload;
    }
  }