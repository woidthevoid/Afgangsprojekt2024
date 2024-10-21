import { Cartesian3, Color, GeometryInstance, PolylineColorAppearance, PolylineGeometry, Primitive, Viewer } from "cesium";

export class FlightPath {
    private viewer: Viewer
    private positions: Cartesian3[] = [];
    private colors: Color[] = [];
    private primitive: Primitive | null = null;

    constructor(viewer: Viewer) {
        this.viewer = viewer
    }

    update(lon: number, lat: number, alt: number, color: Color) {
        const newPosition = Cartesian3.fromDegrees(lon, lat, alt);

        // Add the new position and color to the arrays
        this.positions.push(newPosition);
        this.colors.push(color);

        // If the primitive exists, remove it before creating the updated one
        if (this.primitive) {
            this.viewer.scene.primitives.remove(this.primitive);
        }

        // Create a new primitive with updated geometry
        if (this.positions.length > 1) {
            this.createPrimitive();
        }
    }

    private createPrimitive() {
        if (!this.viewer) {
            return
        }
        const geometry = new PolylineGeometry({
            positions: this.positions,
            vertexFormat: PolylineColorAppearance.VERTEX_FORMAT,
            colors: this.colors,
            colorsPerVertex: true,
            width: 5
        });

        const geometryInstance = new GeometryInstance({
            geometry: geometry,
        });

        this.primitive = new Primitive({
            geometryInstances: geometryInstance,
            appearance: new PolylineColorAppearance(),
            asynchronous: false
        });

        this.viewer.scene.primitives.add(this.primitive);
    }
}