import { Cartesian3, ConstantPositionProperty, Entity, JulianDate } from "cesium";


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
        this.antenna.position = new ConstantPositionProperty(newPosition)
        console.log("antenna moved to ", longitude, latitude, altitude)
    }
}