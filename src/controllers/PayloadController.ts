import { ConstantProperty, Entity, HeadingPitchRoll, JulianDate, Quaternion, Math as CesiumMath, Viewer } from "cesium";
import { PointingLine } from "../flight/PointingLine";

export class PayloadController {
    private payload: Entity | null = null
    private viewer: Viewer | null = null
    private pointingLine: PointingLine | null = null;
    constructor() {}

    setViewer(viewer: Viewer) {
        this.viewer = viewer;
        if (this.payload) {
            //this.pointingLine = new PointingLine(viewer, this.payload);
        }
    }

    setPayload(payload: Entity) {
        console.log("PayloadController.ts: payload has been set");
        this.payload = payload;
    }

    updatePayloadOrientation(newOrientation: Quaternion) {
        if (!this.payload) {
            throw new Error("Payload is undefined");
        }
        this.payload.orientation = new ConstantProperty(newOrientation);
    }

    applyPayloadRotation(yaw: number, pitch: number, roll: number) {
        if (!this.payload) {
            console.error("Payload is undefined");
            return
        }
        // Get the current orientation of the payload
        const currentOrientation = this.payload.orientation?.getValue(JulianDate.now());
      
        if (!currentOrientation) {
          console.error("Payload orientation is undefined!");
          return;
        }
      
        // Create the new rotation based on yaw, pitch, and roll
        const newRotation = Quaternion.fromHeadingPitchRoll(new HeadingPitchRoll(
          CesiumMath.toRadians(yaw),
          CesiumMath.toRadians(pitch),
          CesiumMath.toRadians(roll)
        ));
      
        // Combine the current orientation with the new rotation
        const updatedOrientation = Quaternion.multiply(currentOrientation, newRotation, new Quaternion());
      
        // Update the payload's orientation
        this.updatePayloadOrientation(updatedOrientation);
      }

    //rotation around Z-axis
    updatePayloadYaw(degrees: number) {
        this.applyPayloadRotation(degrees, 0, 0); // Yaw
    }
    
    // rotation around Y-axis
    updatePayloadPitch(degrees: number) {
        this.applyPayloadRotation(0, degrees, 0); // Pitch
    }
    
    // rotation around X-axis
    updatePayloadRoll(degrees: number) {
        this.applyPayloadRotation(0, 0, degrees); // Roll
    }

    getCurrentPosCartesian() {
        if (!this.payload) {
            throw new Error("Drone entity doesn't exist")
        }
        const pos = this.payload.position?.getValue(JulianDate.now());
        return pos
    }
}