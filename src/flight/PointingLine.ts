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
        this.lineLength = lineLength;
        this.terrain = Terrain.getInstance(viewer);

        // Create the polyline as an Entity
        this.createPolyline();
    }

    // Create the polyline using Entity and PolylineGraphics with a CallbackProperty for dynamic updates
    private createPolyline() {
        this.pointingLineEntity = this.viewer.entities.add({
            polyline: new PolylineGraphics({
                positions: new CallbackProperty(() => this.getLinePositions(), false), // Update positions dynamically
                width: 2.0,
                material: Color.YELLOW,
            })
        });
    }

    private async getLinePositions() {
        const entityPosition = this.entity.position?.getValue(JulianDate.now());
        const orientation = this.entity.orientation?.getValue(JulianDate.now());

        if (!entityPosition || !orientation) {
            console.error('Invalid entity position or orientation');
            return [];
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

        const correctedEntityPosition = Cartesian3.fromDegrees(
            CesiumMath.toDegrees(cartographic.longitude),
            CesiumMath.toDegrees(cartographic.latitude),
            alt
        );

        if (!this.isValidCartesian3(correctedEntityPosition)) {
            console.error('Invalid corrected entity position');
            return [];
        }

        // Get the direction the entity is facing
        const rotationMatrix = Matrix3.fromQuaternion(orientation, new Matrix3());

        // Assuming the +X axis is forward
        const direction = Matrix3.multiplyByVector(rotationMatrix, Cartesian3.UNIT_X, new Cartesian3());
        Cartesian3.normalize(direction, direction);  // Normalize the direction vector

        // Extend the direction vector by the specified line length
        const scaledDirection = Cartesian3.multiplyByScalar(direction, this.lineLength, new Cartesian3());

        const endPoint = Cartesian3.add(correctedEntityPosition, scaledDirection, new Cartesian3());

        if (!this.isValidCartesian3(endPoint)) {
            console.error('Invalid end point');
            return [];
        }

        return [correctedEntityPosition, endPoint];
    }


    updatePolyline() {
        if (!this.pointingLineEntity) {
            console.error("Pointing line entity not initialized.");
            return;
        }
        this.viewer.scene.requestRender();
    }

    setLineLength(newLength: number) {
        this.lineLength = newLength;
    }

    isValidCartesian3(cartesian: any): boolean {
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
