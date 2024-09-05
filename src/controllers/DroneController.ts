import { Viewer, Cartesian3, Entity, Cartographic, JulianDate, Math as CesiumMath, SampledPositionProperty } from "cesium";
import { CesiumView } from "../views/CesiumView";

export class DroneController {
    private viewer: Viewer;
    private map: CesiumView
    private drone: Entity | null = null;
    //private positionProperty: SampledPositionProperty;
    private animationFrameId: number | null = null;

    constructor(viewer: Viewer, map: CesiumView) {
        this.viewer = viewer;
        this.map = map

        /* const position = Cartesian3.fromDegrees(10.325663942903187, 55.472172681892225, 100);
        this.currentPosition = position ? position : Cartesian3.ZERO;

        // Initialize the position property using SampledPositionProperty
        this.positionProperty = new SampledPositionProperty();
        this.drone.position = this.positionProperty;

        // Add the initial position to the property
        this.positionProperty.addSample(JulianDate.now(), this.currentPosition);
        console.log(position) */
        /* const INITIAL_LONGITUDE = 10.325663942903187;
        const INITIAL_LATITUDE = 55.472172681892225;
        const INITIAL_ALTITUDE = 100;
        this.map.addDrone(INITIAL_LONGITUDE, INITIAL_LATITUDE, INITIAL_ALTITUDE, true) */
    }

    onMoveClicked() {
        const INITIAL_LONGITUDE = 10.325663942903187;
        const INITIAL_LATITUDE = 55.472172681892225;
        const INITIAL_ALTITUDE = 100;
        this.moveDrone(INITIAL_LONGITUDE, INITIAL_LATITUDE, INITIAL_ALTITUDE, 1)
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
        const startPosition = this.getCurrentPosCartesian();
        if (!startPosition) {
            throw new Error("Starting position is undefined");
        }
        const endPosition = Cartesian3.fromDegrees(longitude, latitude, altitude);
        const startTime: number = performance.now();

        console.log(
            "Start pos:\n",
            startPosition,
            "End pos:\n",
            `lon: ${this.getCurrentLongitude()}, lat: ${this.getCurrentLatitude()}, alt: ${this.getCurrentAltitude()}`
        );

        const moveEntity = (timestamp: number) => {
            const elapsed: number = (timestamp - startTime) / 1000;
            const t: number = Math.min(elapsed / duration, 1);

            // Interpolate position
            const interpolatedPosition = Cartesian3.lerp(startPosition, endPosition, t, new Cartesian3());

            // Update the SampledPositionProperty with the interpolated position
            /* const currentTime = JulianDate.now();
            this.positionProperty.addSample(currentTime, interpolatedPosition); */
            //this.drone.position = interpolatedPosition

            if (t < 1.0) {
                this.animationFrameId = requestAnimationFrame(moveEntity);
            } else {
                console.log("Reached destination");
                this.animationFrameId = null;
            }
        };

        // Start the animation
        this.animationFrameId = requestAnimationFrame(moveEntity);
    }

}