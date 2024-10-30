import { Cartesian3, Color, Entity, GeometryInstance, PolylineColorAppearance, PolylineGeometry, PolylineGraphics, Primitive, Viewer } from "cesium";
import { Terrain } from "./Terrain";

export class FlightPath {
    private viewer: Viewer;
    private terrain: Terrain;
    private minPower: number = Number.POSITIVE_INFINITY;
    private maxPower: number = Number.NEGATIVE_INFINITY;
    private livePathPowers: number[] = [];
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

    private calculateColor(power: number): Color {
        // Calculate a color based on the power value
        // Red shade = high value, blue shade = low value
        const normalizedValue = (power - this.minPower) / (this.maxPower - this.minPower);
        return Color.lerp(Color.BLUE.withAlpha(1.0), Color.RED.withAlpha(1.0), normalizedValue, new Color());
    }

    public updateLivePath(lon: number, lat: number, alt: number, power: number | null = null) {
        const newPosition = Cartesian3.fromDegrees(lon, lat, alt);
        // Track power range for dynamic coloring
        if (power !== null) {
            this.minPower = Math.min(this.minPower, power);
            this.maxPower = Math.max(this.maxPower, power);
        
            // Store power output for each position
            this.livePathPowers.push(power);
        
            // Recalculate colors for all points
            this.livePathColors = this.livePathPowers.map((powerAtPosition) => this.calculateColor(powerAtPosition));
            this.updatePowerScale(this.minPower, this.maxPower);
        } else {
            this.livePathColors.push(Color.BLUE);
        }
    
        // Add the new position
        this.livePathPositions.push(newPosition);
    
        // Remove old primitive and create a new one
        if (this.livePathPrimitive) {
            this.viewer.scene.primitives.remove(this.livePathPrimitive);
        }
    
        if (this.livePathPositions.length > 1) {
            this.createLivePathPrimitive();
        }
    }

    private createLivePathPrimitive() {
        if (!this.viewer) {
            return
        }
        const geometry = new PolylineGeometry({
            positions: this.livePathPositions,
            vertexFormat: PolylineColorAppearance.VERTEX_FORMAT,
            colors: this.livePathColors,
            colorsPerVertex: true,
            width: 3.5
        });

        const geometryInstance = new GeometryInstance({
            geometry: geometry,
        });

        this.livePathPrimitive = new Primitive({
            geometryInstances: geometryInstance,
            appearance: new PolylineColorAppearance({
                translucent: false // Ensures the path is solid and not impacted by paths underneath
            }),
            asynchronous: false,
            depthFailAppearance: new PolylineColorAppearance({ // Add depthFailAppearance for handling overlap
                translucent: false,
            })
        });

        this.viewer.scene.primitives.add(this.livePathPrimitive);
    }

    private updatePowerScale(minPower: number, maxPower: number) {
        const minPowerElement = document.getElementById('min-power');
        const maxPowerElement = document.getElementById('max-power');
        
        if (minPowerElement && maxPowerElement) {
            minPowerElement.textContent = minPower.toFixed(1);
            maxPowerElement.textContent = maxPower.toFixed(1);
        }
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
        this.livePathPowers = [];
        this.livePathPrimitive = null;
        this.minPower = Number.POSITIVE_INFINITY;
        this.maxPower = Number.NEGATIVE_INFINITY;

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
            Cartesian3.fromDegrees(longitude, lats[index], correctedAlts[index])
        );

        // Add determined path to view
        this.determinedPathEntity = this.viewer.entities.add({
            polyline: new PolylineGraphics({
                positions: positions,
                width: 1,
                material: Color.ORANGE.withAlpha(0.5),
                clampToGround: false,
            })
        });

        // Add starting point to view
        this.determinedStartPoint = this.viewer.entities.add({
            id: 'start-point-determined-path',
            position: Cartesian3.fromDegrees(lons[0], lats[0], correctedAlts[0]),
            point: {
                color: Color.GREEN,
                pixelSize: 10,
            }
        });

        // Add end point to view
        this.determinedEndPoint = this.viewer.entities.add({
            id: 'end-point-determined-path',
            position: Cartesian3.fromDegrees(lons[lons.length - 1], lats[lats.length - 1], correctedAlts[correctedAlts.length - 1]),
            point: {
                color: Color.RED,
                pixelSize: 10
            }
        });
    }
}