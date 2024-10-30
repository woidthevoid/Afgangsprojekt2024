import { Viewer, Cartesian3, Entity, Cartographic, JulianDate, Math as CesiumMath, ConstantPositionProperty, Color } from "cesium";
import { PayloadController } from "./PayloadController";
import { FlightPath } from "../flight/FlightPath";

export class DroneController {
    private viewer: Viewer | null = null;
    private drone: Entity | null = null;
    public payloadController: PayloadController;
    private animationFrameId: number | null = null;
    private flightPath: FlightPath | null = null;

    constructor() {
        this.payloadController = new PayloadController();
    }

    setViewer(viewer: Viewer) {
        this.viewer = viewer;
        this.flightPath = new FlightPath(viewer);
        console.log("DroneController.ts: viewer has been set");
    }

    setDrone(drone: Entity) {
        this.drone = drone
        console.log("DroneController.ts: drone has been set");
    }

    setPayload(payload: Entity) {
        this.payloadController.setPayload(payload);
    }

    drawLiveFlightPath (lon: number, lat: number, alt: number) {
        setTimeout(() => {
            this.flightPath?.updateLivePath(lon, lat, alt);
        }, 600);
    }

    setDeterminedFlightPath(lons: number[], lats: number[], alts: number[]) {
        this.flightPath?.updateDeterminedPath(lons, lats, alts);
    }

    removeLivePath() {
        this.flightPath?.removeLivePath();
    }

    resetLivePath() {
        this.flightPath?.resetLivePath();
    }

    removeDeterminedFlightPath() {
        this.flightPath?.removeDeterminedPath();
    }

    testline(lon: number, lat: number, alt: number, power: number) {
        const color = this.getColorForPower(power);
        const animationTime = 0.5
        setTimeout(() => {
        this.flightPath?.updateLivePath(lon, lat, alt, power);
    }, animationTime * 1000 + 100);
        this.moveDrone(lon, lat, alt, animationTime);
    }

    onMoveClicked() {
        const lon = this.generatenewCoords(this.getCurrentLongitude());
        const lat = this.generatenewCoords(this.getCurrentLatitude());
        const alt = 100;
        this.moveDrone(lon, lat, alt, 4);
    }

    setPayloadRoll(degrees: number) {
        this.payloadController.updatePayloadRoll(degrees)
    }

    setPayloadPitch(degrees: number) {
        this.payloadController.updatePayloadPitch(degrees)
    }

    setPayloadYaw(degrees: number) {
        this.payloadController.updatePayloadYaw(degrees)
    }

    generatenewCoords(coordinate: number) {
        // Generate a random boolean value
        const isPositive = Math.random() < 0.5;
    
        // Adjust the number by either +0.01 or -0.01
        return isPositive ? coordinate + 0.0005 : coordinate - 0.0005;
    }

    getCurrentPosGeo() {
        const cartersianPos = this.getCurrentPosCartesian()
        if (!cartersianPos) {
            throw new Error("Drone position is undefined");
        }

        return Cartographic.fromCartesian(cartersianPos);
    }

    getCurrentPosCartesian() {
        if (!this.drone) {
            throw new Error("Drone entity doesn't exist")
        }
        const pos = this.drone.position?.getValue(JulianDate.now());
        return pos
    }

    getCurrentLongitude() {
        const pos = this.getCurrentPosGeo()
        const longitude = CesiumMath.toDegrees(pos.longitude);
        return longitude
    }

    getCurrentLatitude() {
        const pos = this.getCurrentPosGeo()
        const latitude = CesiumMath.toDegrees(pos.latitude);
        return latitude
    }

    getCurrentAltitude() {
        const pos = this.getCurrentPosGeo()
        const altitude = CesiumMath.toDegrees(pos.height);
        return altitude
    }

    /* updatePosition(longitude: number, latitude: number, altitude: number) {
        this.currentPosition = Cartesian3.fromDegrees(longitude, latitude, altitude);

        // Update the SampledPositionProperty with the new position
        //this.positionProperty.addSample(JulianDate.now(), this.currentPosition);
    } */

    moveDrone(longitude: number, latitude: number, altitude: number, duration: number) {
        if (!this.drone) {
            console.warn("DroneController: No drone to move.");
            return;
        }
    
        const startPosition = this.drone.position?.getValue(JulianDate.now());
        if (!startPosition) {
            console.warn("DroneController: Drone starting position is undefined.");
            return;
        }
    
        const endPosition = Cartesian3.fromDegrees(longitude, latitude, altitude);
        const startTime = performance.now();
        
        //this.cancelMoveDrone()

        const moveEntity = (timestamp: number) => {
            const elapsed = (timestamp - startTime) / 1000;
            const t = Math.min(elapsed / duration, 1);
    
            // Interpolate position
            const interpolatedPosition = Cartesian3.lerp(startPosition, endPosition, t, new Cartesian3());
    
            // Use ConstantPositionProperty to update the drone's position
            if (this.drone) {
                this.drone.position = new ConstantPositionProperty(interpolatedPosition);
            }
    
            if (t < 1.0) {
                this.animationFrameId = requestAnimationFrame(moveEntity);
            } else {
                // Finished flight animation
            }
        };
    
        // Start the animation
        /* console.log(
        `
        start pos:
        longitude: ${this.getCurrentLongitude()}
        latitude: ${this.getCurrentLatitude()}
        altitude: ${this.getCurrentAltitude()}
        `
        ) */
        this.animationFrameId = requestAnimationFrame(moveEntity);
    }

    getColorForPower(power: number): Color {
        const normalizedPower = power / 100;
        return Color.fromHsl((1 - normalizedPower) * 0.66, 1.0, 0.5);
    }

    setDronePosition(longitude: number, latitude: number, altitude: number) {
        if (this.drone) {
            const newPosition = Cartesian3.fromDegrees(longitude, latitude, altitude)
            this.drone.position = new ConstantPositionProperty(newPosition);
        }
    }

    cancelMoveDrone() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
}