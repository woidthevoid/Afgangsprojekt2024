import { Cartesian3, ConstantPositionProperty, Entity, JulianDate, Math as CesiumMath, Quaternion, HeadingPitchRoll, ConstantProperty } from "cesium";


export class AntennaController {
    private antenna: Entity | null = null;

    setAntenna(antenna: Entity) {
        this.antenna = antenna
        console.log("AntennaController.ts: antenna has been set");
    }

    getCurrentPosCartesian() {
        if (!this.antenna) {
            throw new Error("Antenna entity is undefined")
        }
        const pos = this.antenna.position?.getValue(JulianDate.now());
        return pos
    }

    updatePosition(longitude: number, latitude: number, altitude: number) {
        if (!this.antenna) {
            return
        }
        const newPosition = Cartesian3.fromDegrees(longitude, latitude, altitude);
        if (this.antenna.position instanceof ConstantPositionProperty) {
            this.antenna.position.setValue(newPosition);
        } else {
            this.antenna.position = new ConstantPositionProperty(newPosition);
        }
    }

    updateAntennaOrientation(newOrientation: Quaternion) {
        if (!this.antenna) {
            return;
        }
        this.antenna.orientation = new ConstantProperty(newOrientation);
    }

    applyAntennaRotation(yaw: number, pitch: number, roll: number) {
        if (!this.antenna) {
            return;
        }
        // Get the current orientation of the Antenna
        const currentOrientation = this.antenna.orientation?.getValue(JulianDate.now());
      
        if (!currentOrientation) {
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
      
        // Update the Antenna's orientation
        this.updateAntennaOrientation(updatedOrientation);
      }

    //rotation around Z-axis
    updateantennaYaw(degrees: number) {
        this.applyAntennaRotation(degrees, 0, 0); // Yaw
    }
    
    // rotation around Y-axis
    updateAntennaPitch(degrees: number) {
        this.applyAntennaRotation(0, degrees, 0); // Pitch
    }
    
    // rotation around X-axis
    updatePayloadRoll(degrees: number) {
        this.applyAntennaRotation(0, 0, degrees); // Roll
    }
}