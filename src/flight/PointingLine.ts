import { Viewer, Cartesian3, Color, CallbackProperty, Entity, PolylineGraphics, JulianDate, Matrix3, Cartographic, Math as CesiumMath } from 'cesium';
import { Terrain } from './Terrain';

export class PointingLine {
    private viewer: Viewer;
    private entity: Entity;
    private terrain: Terrain | null = null;
    private pointingLineEntity: Entity | null = null;
    private lineLength: number;

    constructor(viewer: Viewer, entity: Entity, lineLength: number = 1000) {
        this.viewer = viewer;
        this.entity = entity;
        this.lineLength = lineLength;  // Length of the line representing the pointing direction
        this.terrain = new Terrain(viewer);

        // Create the polyline as an Entity (using PolylineGraphics with dynamic position updates)
        this.createPolyline();
    }

    // Create the polyline using Entity and PolylineGraphics with a CallbackProperty for dynamic updates
    private createPolyline() {
        this.pointingLineEntity = this.viewer.entities.add({
            polyline: new PolylineGraphics({
                positions: new CallbackProperty(() => this.getLinePositions(), false), // Update positions dynamically
                width: 2.0,  // Line thickness in pixels
                material: Color.YELLOW,  // Line color
            })
        });
    }

    private async getLinePositions(): Promise<Cartesian3[]> {
        const entityPosition = this.entity.position?.getValue(JulianDate.now());
        const orientation = this.entity.orientation?.getValue(JulianDate.now());

        // Ensure the entity position and orientation are valid
        if (!entityPosition || !orientation) {
            console.error('Invalid entity position or orientation');
            return [];  // Return an empty array if position or orientation is not available
        }

        // Convert entity position to cartographic (to get latitude, longitude, and height)
        const cartographic = Cartographic.fromCartesian(entityPosition);

        // Sample terrain height
        let terrainHeight: number | undefined;
        try {
            terrainHeight = await this.terrain?.getTerrainHeight(
                CesiumMath.toDegrees(cartographic.longitude),
                CesiumMath.toDegrees(cartographic.latitude)
            );
        } catch (error) {
            console.error('Failed to sample terrain height:', error);
        }

        // If terrain height is valid, add relative altitude, otherwise use default altitude
        let alt = cartographic.height;
        if (terrainHeight !== undefined) {
            alt = terrainHeight + cartographic.height;
        }

        // Correct the position with the calculated altitude
        const correctedEntityPosition = Cartesian3.fromDegrees(
            CesiumMath.toDegrees(cartographic.longitude),
            CesiumMath.toDegrees(cartographic.latitude),
            alt
        );

        // Ensure the corrected position is valid
        if (!this.isValidCartesian3(correctedEntityPosition)) {
            console.error('Invalid corrected entity position');
            return [];  // Return an empty array if the corrected position is invalid
        }

        // Get the direction the entity is facing (based on its orientation quaternion)
        const rotationMatrix = Matrix3.fromQuaternion(orientation, new Matrix3());

        // Assuming the +X axis is forward
        const direction = Matrix3.multiplyByVector(rotationMatrix, Cartesian3.UNIT_X, new Cartesian3());
        Cartesian3.normalize(direction, direction);  // Normalize the direction vector

        // Extend the direction vector by the specified line length
        const scaledDirection = Cartesian3.multiplyByScalar(direction, this.lineLength, new Cartesian3());

        // Calculate the end point of the line
        const endPoint = Cartesian3.add(correctedEntityPosition, scaledDirection, new Cartesian3());

        // Ensure the end point is valid
        if (!this.isValidCartesian3(endPoint)) {
            console.error('Invalid end point');
            return [];  // Return an empty array if the end point is invalid
        }

        // Return the positions for the polyline (start at entity, end at calculated direction)
        return [correctedEntityPosition, endPoint];
    }


    updatePolyline() {
        if (!this.pointingLineEntity) {
            console.error("Pointing line entity not initialized.");
            return;
        }

        // CallbackProperty automatically handles the position updates, so we just trigger a render
        this.viewer.scene.requestRender();
    }

    setLineLength(newLength: number) {
        this.lineLength = newLength;
    }

    isValidCartesian3(cartesian: Cartesian3): boolean {
        return (
            isFinite(cartesian.x) &&
            isFinite(cartesian.y) &&
            isFinite(cartesian.z) &&
            !isNaN(cartesian.x) &&
            !isNaN(cartesian.y) &&
            !isNaN(cartesian.z)
        );
    }
}
