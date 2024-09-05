import { Entity, JulianDate } from "cesium";


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
}