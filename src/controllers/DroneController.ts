import { Viewer, Cartesian3, Entity } from "cesium";

export class DroneController {
    private viewer: Viewer;
    private drone: Entity;

    constructor(viewer: Viewer, drone: Entity) {
        this.viewer = viewer;
        this.drone = drone;
    }

    onMoveClicked() {
        console.log("here")
    }

    currentPosition() {
        return this.drone.position;
    }

    moveDrone(longitude: number, latitude: number, altitude: number, duration: number) {
        const startPosition = this.currentPosition()
    }

}