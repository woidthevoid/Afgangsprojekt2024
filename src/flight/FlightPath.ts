//import { Cartesian3, Color, Entity, GeometryInstance, PolylineColorAppearance, PolylineGeometry, PolylineGraphics, Primitive, Viewer } from "cesium";
import { Terrain } from "./Terrain";

export class FlightPath {
    private viewer: any;
    private terrain: Terrain;
    private livePathPositions: any[] = [];
    private livePathColors: any[] = [];
    private livePathPrimitive: any | null = null;
    private determinedPathEntity: any | null = null;
    private determinedStartPoint: any | null = null;
    private determinedEndPoint: any | null = null;

    constructor(viewer: any) {
        this.terrain = new Terrain(viewer);
        this.viewer = viewer;
    }

    public async updateLivePath(lon: number, lat: number, alt: number, color: any) {
        const terrainHeight = await this.terrain.getTerrainHeight(lon, lat);
        const actualAlt = terrainHeight + alt;
        const newPosition = Cesium.Cartesian3.fromDegrees(lon, lat, actualAlt);
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

    public removeDeterminedPath() {
        const pathEntities = [this.determinedPathEntity, this.determinedStartPoint, this.determinedEndPoint];
        pathEntities.forEach(entity => {
            if (entity) {
                this.viewer.entities.remove(entity);
            }
        });
    }

    public async updateDeterminedPath(lons: number[], lats: number[], alts: number[]) {
        if (lons.length !== lats.length || lats.length !== alts.length) {
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
            alts.map(async (altitude, i) => {
                const terrainHeight = await this.terrain.getTerrainHeight(lons[i], lats[i]);
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
                material: Cesium.Color.ORANGE.withAlpha(0.4),
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