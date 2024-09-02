import { Viewer, createWorldTerrainAsync, Ion, Cartesian3 } from "cesium";
import { DroneEntity } from "../entities/DroneEntity";

export class CesiumView {
    private viewer: Viewer | null = null;
    private drone: DroneEntity | null = null;

    constructor(private containerId: string) {}

    async initialize() {
        if (this.viewer) {
            console.warn("Cesium viewer already initialized.");
            return;
        }

        Ion.defaultAccessToken = process.env.CESIUM_ION_TOKEN || '';

        try {
            const INITIAL_LONGITUDE = 10.325663942903187;
            const INITIAL_LATITUDE = 55.472172681892225;
            const INITIAL_ALTITUDE = 100;

            const terrainProvider = await createWorldTerrainAsync();
            this.viewer = new Viewer(this.containerId, {
                terrainProvider: terrainProvider,
                animation: false,
                timeline: false,
                fullscreenButton: false,
                homeButton: false, 
                infoBox: false, 
                selectionIndicator: false, 
                navigationHelpButton: false, 
                sceneModePicker: false, 
                geocoder: false, 
                baseLayerPicker: false, 
                vrButton: false, 
                creditContainer: document.createElement('div') // Hide credits
            });
            this.viewer.scene.globe.depthTestAgainstTerrain = true;
            this.drone = new DroneEntity(Cartesian3.fromDegrees(INITIAL_LONGITUDE, INITIAL_LATITUDE, INITIAL_ALTITUDE));
            this.viewer.entities.add(this.drone.getEntity());
            this.viewer.trackedEntity = this.drone.getEntity();

        } catch (error) {
            console.error("Failed to initialize Cesium viewer:", error);
        }
    }

    getViewerInstance(): Viewer | null {
        return this.viewer;
    }

    getDroneInstance(): DroneEntity | null {
        return this.drone;
    }

    destroy() {
        if (this.viewer) {
            this.viewer.destroy();
            this.viewer = null;
        }
    }
}