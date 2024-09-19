import { 
    Viewer, 
    createWorldTerrainAsync, 
    Ion, 
    Cartesian3, 
    JulianDate, 
    Transforms, 
    Quaternion, 
    Cartographic, 
    sampleTerrainMostDetailed, 
    Math as CesiumMath, 
    HeadingPitchRoll,
    Entity,
    CallbackProperty,
    Color,
    createGooglePhotorealistic3DTileset,
    Cartesian2,
    SceneTransforms,
    defined
} from "cesium";
import { DroneEntity } from "../entities/DroneEntity";
import { DroneController } from "../controllers/DroneController";
import { AntennaEntity } from "../entities/AntennaEntity";
import { AntennaController } from "../controllers/AntennaController";

export class CesiumView {
    private viewer: Viewer | null = null;
    private drone: DroneEntity | null = null;
    private antenna: AntennaEntity | null = null;
    private pointingLine: Entity | null = null;
    private payloadTrackAntennaCallback: (() => void) | null = null;
    private cameraTrackAntennaCallback: (() => void) | null = null;
    droneController: DroneController;
    antennaController: AntennaController;

    constructor(private containerId: string) {
        this.droneController = new DroneController()
        this.antennaController = new AntennaController()
        this.payloadTrackAntennaCallback = null;
        this.cameraTrackAntennaCallback = null;
        this.pointingLine = null;
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

            const ANTENNA_LONGITUDE = 10.32580470;
            const ANTENNA_LATITUDE = 55.47177510;
            const ANTENNA_ALTITUDE = 0;
            
            console.log("Initializing Cesium viewer...");
            
            const terrainProvider = await createWorldTerrainAsync();
            this.viewer = new Viewer(this.containerId, {
                terrainProvider: terrainProvider,
                //globe: false,
                //skyAtmosphere: new SkyAtmosphere(),
                //requestRenderMode: true,
                //maximumRenderTimeChange: Infinity,
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
            this.viewer.scene.debugShowFramesPerSecond = true

            //this.viewer.scene.globe.depthTestAgainstTerrain = true;

            /* this.viewer.scene.primitives.add(
                await Cesium3DTileset.fromIonAssetId(2275207),
            ); */
            
            console.log("Cesium viewer initialized");
            this.droneController?.setViewer(this.viewer);

            //this.addAntenna(ANTENNA_LONGITUDE, ANTENNA_LATITUDE, ANTENNA_ALTITUDE, false);
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

    updateOverlay() {
        if (!this.viewer) {
            return
        }
        const canvasPosition = new Cartesian2();
        const antennaPos = this.antennaController.getCurrentPosCartesian()
        if (!antennaPos) {
            return
        }
        const windowPosition = SceneTransforms.wgs84ToWindowCoordinates(this.viewer.scene, antennaPos, canvasPosition);
        
        if (defined(windowPosition)) {
            // Set the position of the HTML element based on the canvas position
            const title = document.getElementById('AUTTitle');
            if (title) {
            title.style.left = windowPosition.x + 'px';
            title.style.top = (windowPosition.y - 50) + 'px'; // Adjust 50 pixels above the entity
            }
        }
    }

    mountAntennaToGround() {
        if (!this.viewer) {
            return;
        }
        const terrainProvider = this.viewer.terrainProvider;
        const antennaPosition = this.antennaController.getCurrentPosCartesian();
        if (!antennaPosition) {
            return;
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

    updateCameraOrientationToAntenna2() {
        if (!this.antenna || !this.drone || !this.viewer) {
            return;
        }
    
        const antennaPosition = this.antenna.getEntity().position?.getValue(JulianDate.now());
        const dronePosition = this.droneController.getCurrentPosCartesian();
    
        if (!antennaPosition || !dronePosition) {
            return;
        }
    
        const dronePositionCartographic = Cartographic.fromCartesian(dronePosition);
    
        //adjust the camera to be behind and above the drone
        const offsetDistance = 100.0;
        const heightAboveDrone = 200.0;
    
        //calculate the camera's new position behind and above the drone
        const cameraOffset = new Cartesian3(
            dronePosition.x - offsetDistance,
            dronePosition.y - offsetDistance,
            dronePosition.z + heightAboveDrone
        );
    
        //calculate the direction vector to make the camera look at the antenna
        const directionToAntenna = Cartesian3.normalize(
            Cartesian3.subtract(antennaPosition, cameraOffset, new Cartesian3()),
            new Cartesian3()
        );
    
        //manually update the camera's position and orientation
        this.viewer.camera.setView({
            destination: cameraOffset,
            orientation: {
                direction: directionToAntenna, //make the camera look at the antenna
                up: new Cartesian3(0, 0, 1) //keep the camera's up vector aligned with the globe's up direction
            }
        });
    }

    updateCameraOrientationToAntenna() {
        const dronePos = this.droneController.getCurrentPosCartesian();
        const antennaPos = this.antennaController.getCurrentPosCartesian();
        if (!this.viewer || !dronePos || !antennaPos) {
            console.error("Viewer is undefined");
            return
        }

        //calculate the heading and pitch towards the antenna
        const heading = this.calculateHeading(dronePos, antennaPos);
        const pitch = this.calculatePitch(dronePos, antennaPos);

        //update the camera to look towards the antenna
        this.viewer.camera.setView({
            orientation: new HeadingPitchRoll(heading, pitch, 0) //heading, pitch, roll
        });
    }

    drawPayloadPointingLine() {
        if (this.pointingLine || !this.viewer || !this.drone || !this.antenna) {
            return
        }
        this.pointingLine = this.viewer.entities.add({
            polyline: {
                positions: new CallbackProperty(() => {
                    const payloadPosition = this.droneController.payloadController.getCurrentPosCartesian();
                    const antennaPosition = this.antennaController.getCurrentPosCartesian();

                    if (payloadPosition && antennaPosition) {
                        return [payloadPosition, antennaPosition]; // Line between payload and antenna
                    } else {
                        return []; // Empty array if positions are undefined
                    }
                }, false), // Recompute the polyline positions on every frame
                width: 2,
                material: Color.RED // Customize the color as needed
            }
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

    onAddAntennaClicked() {
        const ANTENNA_LONGITUDE = 10.32580470;
        const ANTENNA_LATITUDE = 55.47177510;
        const ANTENNA_ALTITUDE = 0;
        this.addAntenna(ANTENNA_LONGITUDE, ANTENNA_LATITUDE, ANTENNA_ALTITUDE, false);
    }

    onAddDroneClicked() {
        const ANTENNA_LONGITUDE = 10.32580470;
        const ANTENNA_LATITUDE = 55.47177510;
        const INITIAL_LONGITUDE = 10.325663942903187;
        const INITIAL_LATITUDE = 55.472172681892225;
        const INITIAL_ALTITUDE = 50;
        this.addDrone(INITIAL_LONGITUDE, INITIAL_LATITUDE, INITIAL_ALTITUDE, true)
    }

    addDrone(initialLongitude: number, initialLatitude: number, initialAltitude: number, tracked: boolean) {
        if (!this.viewer) {
            throw new Error("Viewer is null");
        }
        this.drone = new DroneEntity(this.viewer, Cartesian3.fromDegrees(initialLongitude, initialLatitude, initialAltitude));
        const droneEntity = this.drone.getEntity()
        const payloadEntity = this.drone.getPayload()
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
        //this.mountAntennaToGround()
    }

    followDrone(follow: boolean) {
        if (!this.viewer || !this.drone) {
            return
        }
        if (follow) {
            this.viewer.trackedEntity = this.drone.getEntity()
        } else {
            this.viewer.trackedEntity = undefined
        }
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

    payloadTrackAntenna() {
        if (!this.viewer) {
            console.error("Viewer is undefined");
            return
        }
        this.payloadTrackAntennaCallback = () => {
            this.updatePayloadOrientationToAntenna(); 
        };
        this.viewer.clock.onTick.addEventListener(this.payloadTrackAntennaCallback);
    }

    payloadStopTrackingAntenna() {
        if (this.payloadTrackAntennaCallback && this.viewer) {
            this.viewer.clock.onTick.removeEventListener(this.payloadTrackAntennaCallback);
            this.payloadTrackAntennaCallback = null;
        }
    }

    //helper function to calculate heading from direction vector
    calculateHeading(fromPosition: Cartesian3, toPosition: Cartesian3): number {
        const direction = Cartesian3.subtract(toPosition, fromPosition, new Cartesian3());
        return Math.atan2(direction.y, direction.x);
    }

    //helper function to calculate pitch from direction vector
    calculatePitch(fromPosition: Cartesian3, toPosition: Cartesian3): number {
        const direction = Cartesian3.subtract(toPosition, fromPosition, new Cartesian3());
        const flatDistance = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        return Math.atan2(direction.z, flatDistance);
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