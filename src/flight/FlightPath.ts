import { Cartesian3, Color, Entity, GeometryInstance, PolylineColorAppearance, PolylineGeometry, PolylineGraphics, Primitive, Viewer } from "cesium";
import { Terrain } from "./Terrain";

export class FlightPath {
    private viewer: Viewer;
    private terrain: Terrain;
    private livePathPositions: Cartesian3[] = [];
    private livePathColors: Color[] = [];
    private livePathPrimitive: Primitive | null = null;
    private determinedPathEntity: Entity | null = null;
    private determinedStartPoint: Entity | null = null;
    private determinedEndPoint: Entity | null = null;

    constructor(viewer: Viewer) {
        this.terrain = Terrain.getInstance(viewer);
        this.viewer = viewer;
    }

    public updateLivePath(lon: number, lat: number, alt: number, color: Color) {
        const newPosition = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
        // Add the new position and color to the arrays
        this.livePathPositions.push(newPosition);
        this.livePathColors.push(color);

        // If the primitive exists, remove it before creating the updated one
        if (this.livePathPrimitive) {
            this.viewer.scene.primitives.remove(this.livePathPrimitive);
        }

        // Create a new primitive with updated geometry
        if (this.livePathPositions.length > 1) {
            this.createLivePathPrimitive();
        }
    }

    private createLivePathPrimitive() {
        if (!this.viewer) {
            return
        }
        const geometry = new Cesium.PolylineGeometry({
            positions: this.livePathPositions,
            vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
            colors: this.livePathColors,
            colorsPerVertex: true,
            width: 3.5
        });

        const geometryInstance = new Cesium.GeometryInstance({
            geometry: geometry,
        });

        this.livePathPrimitive = new Cesium.Primitive({
            geometryInstances: geometryInstance,
            appearance: new Cesium.PolylineColorAppearance({
                translucent: false // Ensures the path is solid and not impacted by paths underneath
            }),
            asynchronous: false,
            depthFailAppearance: new Cesium.PolylineColorAppearance({ // Add depthFailAppearance for handling overlap
                translucent: false,
            })
        });

        this.viewer.scene.primitives.add(this.livePathPrimitive);
    }

    public removeLivePath() {
        if (this.livePathPrimitive) {
            this.viewer.scene.primitives.remove(this.livePathPrimitive);
        }
    }

    public resetLivePath() {
        this.removeLivePath();
        this.livePathPositions = [];
        this.livePathColors = [];
        this.livePathPrimitive = null;

    }

    public removeDeterminedPath() {
        const pathEntities = [this.determinedPathEntity, this.determinedStartPoint, this.determinedEndPoint];
        pathEntities.forEach(entity => {
            if (entity) {
                this.viewer.entities.remove(entity);
            }
        });
    }

    public async updateDeterminedPath(lons: number[], lats: number[], alts: number[]) {
        if (lons.length !== lats.length || lats.length !== alts.length || this.terrain.getGroundRef() == -1) {
            return null;
        }
        
        // Remove the entities if they already exist
        const pathEntities = [this.determinedPathEntity, this.determinedStartPoint, this.determinedEndPoint];
        pathEntities.forEach(entity => {
            if (entity) {
                this.viewer.entities.remove(entity);
            }
        });

        const correctedAlts = await Promise.all(
            alts.map(async (altitude, _i) => {
                const terrainHeight = this.terrain.getGroundRef();
                const updatedAltitude = terrainHeight + altitude;
                return updatedAltitude;
            })
        );

        const positions = lons.map((longitude, index) => 
            Cesium.Cartesian3.fromDegrees(longitude, lats[index], correctedAlts[index])
        );

        // Add determined path to view
        this.determinedPathEntity = this.viewer.entities.add({
            polyline: new Cesium.PolylineGraphics({
                positions: positions,
                width: 1,
                material: Cesium.Color.ORANGE.withAlpha(0.5),
                clampToGround: false,
            })
        });

        // Add starting point to view
        this.determinedStartPoint = this.viewer.entities.add({
            id: 'start-point-determined-path',
            position: Cesium.Cartesian3.fromDegrees(lons[0], lats[0], correctedAlts[0]),
            point: {
                color: Cesium.Color.GREEN,
                pixelSize: 10,
            }
        });

        // Add end point to view
        this.determinedEndPoint = this.viewer.entities.add({
            id: 'end-point-determined-path',
            position: Cesium.Cartesian3.fromDegrees(lons[lons.length - 1], lats[lats.length - 1], correctedAlts[correctedAlts.length - 1]),
            point: {
                color: Cesium.Color.RED,
                pixelSize: 10
            }
        });
    }
}