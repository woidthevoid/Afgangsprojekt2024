import { Viewer, createWorldTerrainAsync, Ion, Cartesian3, JulianDate, Transforms, Quaternion, Cartographic, sampleTerrainMostDetailed, Math as CesiumMath} from "cesium";
import { DroneEntity } from "../entities/DroneEntity";
import { DroneController } from "../controllers/DroneController";
import { AntennaEntity } from "../entities/AntennaEntity";
import { AntennaController } from "../controllers/AntennaController";

export class CesiumView {
    private viewer: Viewer | null = null;
    private drone: DroneEntity | null = null;
    private antenna: AntennaEntity | null = null;
    private trackAntennaCallback: (() => void) | null = null;
    droneController: DroneController;
    antennaController: AntennaController;

    constructor(private containerId: string) {
        this.droneController = new DroneController()
        this.antennaController = new AntennaController()
        this.trackAntennaCallback = null;
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

            const ANTENNA_LONGITUDE = 10.325663942903187;
            const ANTENNA_LATITUDE = 55.472172681892225;
            const ANTENNA_ALTITUDE = 40;
            
            console.log("Initializing Cesium viewer...");
    
            const terrainProvider = await createWorldTerrainAsync();
            this.viewer = new Viewer(this.containerId, {
                terrainProvider: terrainProvider,
                //globe: false,
                //skyAtmosphere: new SkyAtmosphere(),
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

            /* this.viewer.scene.primitives.add(
                await Cesium3DTileset.fromIonAssetId(2275207),
            ); */
            
            console.log("Cesium viewer initialized");
            this.droneController?.setViewer(this.viewer)

            this.addAntenna(ANTENNA_LONGITUDE, ANTENNA_LATITUDE, ANTENNA_ALTITUDE, false);
            //this.mountAntennaToGround()

        } catch (error) {
            // Log full error details
            if (error instanceof Error) {
                console.error("Failed to initialize Cesium viewer:", error.message, error.stack);
            } else {
                console.error("Failed to initialize Cesium viewer:", error);
            }
        }
    }

    mountAntennaToGround() {
        if (!this.viewer) {
            return
        }
        const terrainProvider = this.viewer.terrainProvider;
        const antennaPosition = this.antennaController.getCurrentPosCartesian()
        if (!antennaPosition) {
            return
        }
        const cartographicPosition = Cartographic.fromCartesian(antennaPosition);
        sampleTerrainMostDetailed(terrainProvider, [cartographicPosition])
            .then((updatedPositions) => {
                const height = updatedPositions[0].height;
                // Update the antenna position with the correct height
                const groundPosition = Cartesian3.fromDegrees(
                    CesiumMath.toDegrees(cartographicPosition.longitude),
                    CesiumMath.toDegrees(cartographicPosition.latitude),
                    height
                );
                this.antenna?.setPos(groundPosition) // Update entity position to the ground height
            })
            .catch((error) => {
                console.error("Failed to sample terrain height:", error);
            });
    }

    testpyqtmove(lon: number, lat: number, alt: number) {
        this.droneController?.moveDrone(lon, lat, alt, 10)
    }

    onMoveClicked() {
        this.droneController?.onMoveClicked()
    }

    onRotateClicked() {
        this.droneController?.onRotateClicked()
    }

    onCancelClicked() {
        this.droneController?.cancelMoveDrone()
    }

    setPayloadRoll(degrees: number) {
        this.droneController?.setPayloadRoll(degrees)
    }

    setPayloadPitch(degrees: number) {
        this.droneController?.setPayloadPitch(degrees)
    }

    setPayloadYaw(degrees: number) {
        this.droneController?.setPayloadYaw(degrees)
    }

    onAddDroneClicked() {
        console.log("add drone test")
        const INITIAL_LONGITUDE = 10.325663942903187;
        const INITIAL_LATITUDE = 55.472172681892225;
        const INITIAL_ALTITUDE = 100;
        this.addDrone(INITIAL_LONGITUDE, INITIAL_LATITUDE, INITIAL_ALTITUDE, true)
    }

    addDrone(initialLongitude: number, initialLatitude: number, initialAltitude: number, tracked: boolean) {
        if (!this.viewer) {
            throw new Error("Viewer is null");
        }
        this.drone = new DroneEntity(this.viewer, Cartesian3.fromDegrees(initialLongitude, initialLatitude, initialAltitude));
        const droneEntity = this.drone.getEntity()
        const payloadEntity = this.drone.getPayload()
        //this.viewer.entities.add(droneEntity);
        if (tracked) {
        this.viewer.trackedEntity = droneEntity;
        }
        console.log(`CesiumView.ts: Drone added: ${droneEntity.id}`)
        this.droneController?.setDrone(droneEntity)
        this.droneController?.setPayload(payloadEntity)
    }

    addAntenna(initialLongitude: number, initialLatitude: number, initialAltitude: number, tracked: boolean) {
        this.antenna = new AntennaEntity(Cartesian3.fromDegrees(initialLongitude, initialLatitude, initialAltitude));
        const antennaEntity = this.antenna.getEntity()
        if (this.viewer) {
            this.viewer.entities.add(antennaEntity);
            if (tracked) {
            this.viewer.trackedEntity = antennaEntity;
            }
        }
        console.log(`CesiumView.ts: Antenna added: ${antennaEntity.id}`)
        this.antennaController.setAntenna(this.antenna.getEntity())
    }

    updatePayloadOrientationToAntenna() {
        if (!this.drone || !this.antenna) {
            return;
        }
        const dronePosition = this.droneController.getCurrentPosCartesian()
        const antennaPosition = this.antenna.getEntity().position?.getValue(JulianDate.now());
    
        if (!dronePosition || !antennaPosition) {
            console.error("Drone or Antenna position is undefined!");
            return;
        }
    
        // Compute the direction vector from the drone to the antenna
        const direction = Cartesian3.subtract(antennaPosition, dronePosition, new Cartesian3());
        Cartesian3.normalize(direction, direction); // Normalize the vector
    
        // Create the quaternion to align the payload with the direction vector
        const matrix = Transforms.rotationMatrixFromPositionVelocity(dronePosition, direction);
        const quaternion = Quaternion.fromRotationMatrix(matrix);
    
        // Update the payload's orientation to point towards the antenna
        this.drone.updatePayloadOrientation(quaternion);
    }

    trackAntenna() {
        if (!this.viewer) {
            console.error("Viewer is undefined");
            return
        }
        this.trackAntennaCallback = () => {
            this.updatePayloadOrientationToAntenna(); 
        };
        this.viewer.clock.onTick.addEventListener(this.trackAntennaCallback);
    }

    stopTrackingAntenna() {
        if (this.trackAntennaCallback) {
            if(this.viewer) {
                this.viewer.clock.onTick.removeEventListener(this.trackAntennaCallback);
            this.trackAntennaCallback = null;
            }
        }
    }

    getViewerInstance(): Viewer | null {
        return this.viewer;
    }

    getDroneInstance(): DroneEntity | null {
        return this.drone;
    }

    getAntennaInstance(): AntennaEntity | null {
        return this.antenna;
    }

    destroy() {
        if (this.viewer) {
            this.viewer.destroy();
            this.viewer = null;
        }
    }
}