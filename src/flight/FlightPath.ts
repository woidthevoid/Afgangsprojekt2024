import { 
    Cartesian3, 
    Color, 
    ColorGeometryInstanceAttribute, 
    ConstantPositionProperty, 
    ConstantProperty, 
    Entity, 
    GeometryInstance, 
    HorizontalOrigin, 
    LabelGraphics, 
    LabelStyle, 
    NearFarScalar, 
    PolylineColorAppearance, 
    PolylineGeometry, 
    PolylineGraphics, 
    Primitive, 
    VerticalOrigin, 
    Math as CesiumMath,
    Viewer 
} from "cesium";
import { Terrain } from "./Terrain";

export class FlightPath {
    private viewer: Viewer;
    private terrain: Terrain;
    private minSpectrum: number = Number.POSITIVE_INFINITY;
    private maxSpectrum: number = Number.NEGATIVE_INFINITY;
    private livePathSpectrum: number[] = [];
    private livePathPositions: Cartesian3[] = [];
    private livePathColors: Color[] = [];
    private determinedPathPositions: Cartesian3[] = [];
    private livePathPrimitive: Primitive | null = null;
    private determinedPathEntity: Entity | null = null;
    private determinedStartPoint: Entity | null = null;
    private determinedEndPoint: Entity | null = null;
    private distanceLinePrimitive: Primitive | null = null;
    private distanceLabel: Entity | null = null;
    private headingLinePrimitive: Primitive | null = null;

    constructor(viewer: Viewer) {
        this.terrain = Terrain.getInstance(viewer);
        this.viewer = viewer;
    }

    private calculateColor(spectrum: number): Color {
        // Calculate a color based on the spectrum value
        // Red shade = high value, blue shade = low value
        if (spectrum == -9999) {
            return Color.WHITE;
        }
        const normalizedValue = (spectrum - this.minSpectrum) / (this.maxSpectrum - this.minSpectrum);
        return Color.lerp(Color.BLUE.withAlpha(1.0), Color.RED.withAlpha(1.0), normalizedValue, new Color());
    }

    public updateLivePath(lon: number, lat: number, alt: number, spectrum: number | null = null) {
        const newPosition = Cartesian3.fromDegrees(lon, lat, alt);
        // Track spectrum range for dynamic coloring
        if (spectrum !== null) {
            this.minSpectrum = Math.min(this.minSpectrum, spectrum);
            this.maxSpectrum = Math.max(this.maxSpectrum, spectrum);
        
            // Store spectrum output for each position
            this.livePathSpectrum.push(spectrum);
        
            // Recalculate colors for all points
            this.livePathColors = this.livePathSpectrum.map((spectrumAtPosition) => this.calculateColor(spectrumAtPosition));
            this.updateSpectrumScale(this.minSpectrum, this.maxSpectrum);
        } else {
            this.livePathSpectrum.push(-9999)
            this.livePathColors.push(Color.WHITE);
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

    public updateDistanceLine(lon: number, lat: number, alt: number) {
        if (!this.determinedPathEntity) {
            return;
        }

        const dronePosition = Cartesian3.fromDegrees(lon, lat, alt);

        // Find the closest point on the determined path to the current drone position
        const nearestPoint = this.getNearestPointOnPath(dronePosition, this.determinedPathPositions);
        const distance = Cartesian3.distance(dronePosition, nearestPoint);

        // Remove the previous line primitive if it exists
        if (this.distanceLinePrimitive) {
            this.viewer.scene.primitives.remove(this.distanceLinePrimitive);
        }

        // Create a new polyline geometry between the drone position and the nearest point
        const geometry = new PolylineGeometry({
            positions: [dronePosition, nearestPoint],
            width: 2.0,
            vertexFormat: PolylineColorAppearance.VERTEX_FORMAT,
        });

        const geometryInstance = new GeometryInstance({
            geometry: geometry,
            attributes: {
                color: ColorGeometryInstanceAttribute.fromColor(Color.YELLOW)
            }
        });

        this.distanceLinePrimitive = new Primitive({
            geometryInstances: geometryInstance,
            appearance: new PolylineColorAppearance({
                translucent: false
            }),
            asynchronous: false
        });

        this.viewer.scene.primitives.add(this.distanceLinePrimitive);

        // Calculate the midpoint for placing the label
        const midpoint = Cartesian3.midpoint(dronePosition, nearestPoint, new Cartesian3());
        

        // Add or update the distance label
        if (this.distanceLabel) {
            // Update the label position and text if it already exists
            this.distanceLabel.position = new ConstantPositionProperty(midpoint);
            this.distanceLabel.label!.text = new ConstantProperty(`${distance.toFixed(2)} m`);
        } else {
            // Create a new label if it doesn't exist
            this.distanceLabel = this.viewer.entities.add({
                position: midpoint,
                label: new LabelGraphics({
                    text: `${distance.toFixed(2)} m`,
                    font: '14px sans-serif',
                    fillColor: Color.YELLOW,
                    outlineColor: Color.BLACK,
                    outlineWidth: 2,
                    style: LabelStyle.FILL_AND_OUTLINE,
                    showBackground: true,
                    backgroundColor: new Color(0, 0, 0, 0.5),
                    verticalOrigin: VerticalOrigin.CENTER,
                    horizontalOrigin: HorizontalOrigin.CENTER,
                    eyeOffset: new Cartesian3(0, 0, -5),  // Slight offset to improve visibility
                    scaleByDistance: new NearFarScalar(
                        100.0, 1.0,
                        1000.0, 0
                    )
                })
            });
        }
    }

    private getNearestPointOnPath(position: Cartesian3, path: Cartesian3[]): Cartesian3 {
        let closestPoint = path[0];
        let minDistance = Cartesian3.distance(position, closestPoint);

        for (const pathPoint of path) {
            const distance = Cartesian3.distance(position, pathPoint);
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = pathPoint;
            }
        }

        return closestPoint;
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

    private updateSpectrumScale(minSpectrum: number, maxSpectrum: number) {
        const minSpectrumElement = document.getElementById('min-spectrum');
        const maxSpectrumElement = document.getElementById('max-spectrum');
        
        if (minSpectrumElement && maxSpectrumElement) {
            minSpectrumElement.textContent = minSpectrum.toFixed(1);
            maxSpectrumElement.textContent = maxSpectrum.toFixed(1);
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
        this.livePathSpectrum = [];
        this.livePathPrimitive = null;
        this.minSpectrum = Number.POSITIVE_INFINITY;
        this.maxSpectrum = Number.NEGATIVE_INFINITY;

    }

    public removeDeterminedPath() {
        const pathEntities = [this.determinedPathEntity, this.determinedStartPoint, this.determinedEndPoint];
        pathEntities.forEach(entity => {
            if (entity) {
                this.viewer.entities.remove(entity);
            }
        });
        this.determinedPathPositions = [];
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

        const terrainHeight = this.terrain.getGroundRef();
        const correctedAlts = alts.map((altitude) => {
            const updatedAltitude = terrainHeight + altitude;
            return updatedAltitude;
        });

        this.determinedPathPositions = lons.map((longitude, index) => 
            Cartesian3.fromDegrees(longitude, lats[index], correctedAlts[index])
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
                scaleByDistance: new NearFarScalar(
                    100.0, 1.0,
                    1000.0, 0
                )
            }
        });

        // Add end point to view
        this.determinedEndPoint = this.viewer.entities.add({
            id: 'end-point-determined-path',
            position: Cartesian3.fromDegrees(lons[lons.length - 1], lats[lats.length - 1], correctedAlts[correctedAlts.length - 1]),
            point: {
                color: Color.RED,
                pixelSize: 10,
                scaleByDistance: new NearFarScalar(
                    100.0, 1.0,
                    1000.0, 0
                )
            }
        });
    }

    public updateHeadingArrow(lon: number, lat: number, alt: number, heading: number) {
        const length = 5;  // Length of the main line
        const arrowHeadLength = 1;  // Length of each side of the arrowhead
        const headingRadians = CesiumMath.toRadians(heading);
        // Calculate the main line start and end points
        const position = Cartesian3.fromDegrees(lon, lat, alt);
        const endPoint = new Cartesian3(
            position.x + length * Math.cos(headingRadians),
            position.y + length * Math.sin(headingRadians),
            position.z
        );

        // Calculate the left and right points for the arrowhead
        const angleOffset = CesiumMath.toRadians(30);  // 30-degree offset for arrowhead
        const leftPoint = new Cartesian3(
            endPoint.x - arrowHeadLength * Math.cos(headingRadians + angleOffset),
            endPoint.y - arrowHeadLength * Math.sin(headingRadians + angleOffset),
            endPoint.z
        );

        const rightPoint = new Cartesian3(
            endPoint.x - arrowHeadLength * Math.cos(headingRadians - angleOffset),
            endPoint.y - arrowHeadLength * Math.sin(headingRadians - angleOffset),
            endPoint.z
        );

        // Remove the previous primitive if it exists
        if (this.headingLinePrimitive) {
            this.viewer.scene.primitives.remove(this.headingLinePrimitive);
        }

        // Create new geometry for the arrow shape
        const geometry = new PolylineGeometry({
            positions: [position, endPoint, leftPoint, endPoint, rightPoint],
            width: 3.0,
            vertexFormat: PolylineColorAppearance.VERTEX_FORMAT
        });

        const geometryInstance = new GeometryInstance({
            geometry: geometry,
            attributes: {
                color: ColorGeometryInstanceAttribute.fromColor(Color.GREENYELLOW)
            }
        });

        // Create the arrow as a primitive
        this.headingLinePrimitive = new Primitive({
            geometryInstances: geometryInstance,
            appearance: new PolylineColorAppearance({
                translucent: false
            }),
            asynchronous: false
        });

        // Add the new primitive to the viewer
        this.viewer.scene.primitives.add(this.headingLinePrimitive);
    }
}