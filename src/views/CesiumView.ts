import { Viewer, createWorldTerrainAsync, Ion, Cartesian3 } from "cesium";
import { DroneEntity } from "../entities/DroneEntity";
import { DroneController } from "../controllers/DroneController";

export class CesiumView {
    private viewer: Viewer | null = null;
    private drone: DroneEntity | null = null;
    private droneController: DroneController | null = null;

    constructor(private containerId: string) {
        this.droneController = new DroneController()
    }

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
            
            console.log("Initializing Cesium viewer...");
    
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
            /* this.drone = new DroneEntity(Cartesian3.fromDegrees(INITIAL_LONGITUDE, INITIAL_LATITUDE, INITIAL_ALTITUDE));
            this.viewer.entities.add(this.drone.getEntity());
            this.viewer.trackedEntity = this.drone.getEntity(); */
            
            console.log("Cesium viewer initialized");
            this.droneController?.setViewer(this.viewer)
        } catch (error) {
            // Log full error details
            if (error instanceof Error) {
                console.error("Failed to initialize Cesium viewer:", error.message, error.stack);
            } else {
                console.error("Failed to initialize Cesium viewer:", error);
            }
        }
    }

    onMoveClicked() {
        console.log("Move clicked");
        this.droneController?.onMoveClicked()
    }

    onAddDroneClicked() {
        console.log("add drone test")
        const INITIAL_LONGITUDE = 10.325663942903187;
        const INITIAL_LATITUDE = 55.472172681892225;
        const INITIAL_ALTITUDE = 100;
        this.addDrone(INITIAL_LONGITUDE, INITIAL_LATITUDE, INITIAL_ALTITUDE, true)
    }

    addDrone(initialLongitude: number, initialLatitude: number, initialAltitude: number, tracked: boolean) {
        this.drone = new DroneEntity(Cartesian3.fromDegrees(initialLongitude, initialLatitude, initialAltitude));
        const droneEntity = this.drone.getEntity()
        if (this.viewer) {
            this.viewer.entities.add(droneEntity);
            if (tracked) {
            this.viewer.trackedEntity = droneEntity;
            }
        }
        console.log(`CesiumView.ts: Drone added: ${droneEntity.id}`)
        this.droneController?.setDrone(droneEntity)
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