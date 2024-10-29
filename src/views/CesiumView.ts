import { DroneEntity } from "../entities/DroneEntity";
import { DroneController } from "../controllers/DroneController";
import { AntennaEntity } from "../entities/AntennaEntity";
import { AntennaController } from "../controllers/AntennaController";
import { EntityManager } from "../managers/EntityManager";
import { Terrain } from "../flight/Terrain";

function getRandomPower(): number {
    return Math.floor(Math.random() * 101);  // Generate a random integer between 0 and 100
}

export class CesiumView {
    private tileset: any | null = null;
    private viewer: any | null = null;
    private drone: DroneEntity | null = null;
    private antenna: AntennaEntity | null = null;
    private pointingLine: any | null = null;
    private payloadTrackAntennaCallback: (() => void) | null = null;
    private terrain: Terrain | null = null;
    droneController: DroneController;
    antennaController: AntennaController;
    entityManager: EntityManager;
    trackedAntenna: any | null = null;

    constructor(private containerId: string) {
        this.droneController = new DroneController();
        this.antennaController = new AntennaController();
        this.entityManager = new EntityManager();
        this.payloadTrackAntennaCallback = null;
        this.pointingLine = null;
        this.tileset = null;
    }

    async initialize() {
        if (this.viewer) {
            console.warn("Cesium viewer already initialized.");
            return;
        }
    
        //Ion.defaultAccessToken = process.env.CESIUM_ION_TOKEN || '';
        Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5OWVkODE4My0zMWY5LTQzNzUtODAyNS0zNzEyODNlODA5NDIiLCJpZCI6MjE2MjQyLCJpYXQiOjE3MTYxMzMwMTh9.Y_CiD8iZD2AuRE5w-WiBn-AzouFnFVGa_pQ9s7C7oHY"
    
        try {
            console.log("Initializing Cesium viewer...");
            const terrainProvider = await Cesium.createWorldTerrainAsync();
            this.viewer = new Cesium.Viewer(this.containerId, {
                terrainProvider: terrainProvider,
                //globe: false,
                //skyAtmosphere: new SkyAtmosphere(),
                //requestRenderMode: true,
                //maximumRenderTimeChange: Infinity,
                //skyBox: false,
                skyAtmosphere: false,
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
            this.viewer.scene.debugShowFramesPerSecond = true;
            const imageryProvider = await Cesium.createWorldImageryAsync();
            this.viewer.imageryLayers.addImageryProvider(imageryProvider);
            this.terrain = Terrain.getInstance(this.viewer);
            //this.viewer.scene.backgroundColor = Color.BLACK;

            //this.viewer.scene.globe.depthTestAgainstTerrain = true;

            //3d tiles
            /* this.viewer.scene.primitives.add(
                await Cesium3DTileset.fromIonAssetId(2275207),
            ); */
            
            console.log("Cesium viewer initialized");
            //this.droneController?.setViewer(this.viewer);

            /* const timestamps = [1633024800, 1633024900, 1633025000, 1633025100, 1633025200];
            const latitudes = [55.4725, 55.4730, 55.4735, 55.4740, 55.4745];
            const longitudes = [10.3260, 10.3265, 10.3270, 10.3275, 10.3280];
            const altitudes = [50, 55, 60, 65, 70];
            this.createFlightPathFromData(timestamps, longitudes, latitudes, altitudes); */
            return this.viewer;
        } catch (error) {
            // Log full error details
            if (error instanceof Error) {
                console.error("Failed to initialize Cesium viewer:", error.message, error.stack);
            } else {
                console.error("Failed to initialize Cesium viewer:", error);
            }
            return null;
        }
    }

    updateCameraOrientationToAntenna2() {
        if (!this.antenna || !this.drone || !this.viewer) {
            return;
        }
    
        const antennaPosition = this.antenna.getEntity().position?.getValue(Cesium.JulianDate.now());
        const dronePosition = this.droneController.getCurrentPosCartesian();
    
        if (!antennaPosition || !dronePosition) {
            return;
        }
    
        const dronePositionCartographic = Cesium.Cartographic.fromCartesian(dronePosition);
    
        //adjust the camera to be behind and above the drone
        const offsetDistance = 100.0;
        const heightAboveDrone = 200.0;
    
        //calculate the camera's new position behind and above the drone
        const cameraOffset = new Cesium.Cartesian3(
            dronePosition.x - offsetDistance,
            dronePosition.y - offsetDistance,
            dronePosition.z + heightAboveDrone
        );
    
        //calculate the direction vector to make the camera look at the antenna
        const directionToAntenna = Cesium.Cartesian3.normalize(
            Cesium.Cartesian3.subtract(antennaPosition, cameraOffset, new Cesium.Cartesian3()),
            new Cesium.Cartesian3()
        );
    
        //manually update the camera's position and orientation
        this.viewer.camera.setView({
            destination: cameraOffset,
            orientation: {
                direction: directionToAntenna,
                up: new Cesium.Cartesian3(0, 0, 1) //keep the camera's up vector aligned with the globe's up direction
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
            orientation: new Cesium.HeadingPitchRoll(heading, pitch, 0)
        });
    }

    drawPayloadPointingLine() {
        if (this.pointingLine || !this.viewer || !this.drone || !this.antenna) {
            return
        }
        this.pointingLine = this.viewer.entities.add({
            polyline: {
                positions: new Cesium.CallbackProperty(() => {
                    const payloadPosition = this.droneController.payloadController.getCurrentPosCartesian();
                    const antennaPosition = this.antennaController.getCurrentPosCartesian();

                    if (payloadPosition && antennaPosition) {
                        return [payloadPosition, antennaPosition]; // Line between payload and antenna
                    } else {
                        return []; // Empty array if positions are undefined
                    }
                }, false), // Recompute the polyline positions on every frame
                width: 2,
                material: Cesium.Color.RED
            }
        });
    }

    addAntenna(id: string, lon: number, lat: number, alt: number) {
        if (!this.viewer) {
            throw new Error("Viewer is null");
        }
        const antenna = new AntennaEntity(id, Cesium.Cartesian3.fromDegrees(lon, lat, alt));
        const antennaEntity = antenna.getEntity()
        const antennaController = new AntennaController()
        antennaController.setAntenna(antennaEntity)
        this.viewer.entities.add(antennaEntity)
        this.entityManager.addEntity(antennaEntity, antennaController)
        this.trackedAntenna = antennaEntity
        console.log(`CesiumView.ts: Antenna added: ${antennaEntity.id}`)
    }

    updateAntennaPos(id: string, lon: number, lat: number, alt: number) {
        if (!this.viewer) {
            console.error("Viewer is null");
        }
        try {
            const antenna = this.entityManager.getControllerByEntityId(id);
            if (antenna instanceof AntennaController) {
                antenna.updatePosition(lon, lat, alt);
            }
        } catch (error) {
            console.error("Failed to update antenna position - ", error)
        }
    }

    addDrone(id: string, lon: number, lat: number, alt: number) {
        if (!this.viewer) {
            throw new Error("Viewer is null");
        }
        if (!id) {
            id = "drone-entity"
        }
        try {
            const drone = new DroneEntity(this.viewer, id, Cesium.Cartesian3.fromDegrees(lon, lat, alt));
            const droneController = new DroneController()
            const droneEntity = drone.getEntity()
            const payloadEntity = drone.getPayload()
            droneController.setDrone(droneEntity)
            droneController.setPayload(payloadEntity)
            droneController.setViewer(this.viewer)
            droneController.payloadController.setViewer(this.viewer)
            this.viewer.trackedEntity = droneEntity;
            this.entityManager.addEntity(droneEntity, droneController)
            this.payloadTrackAntenna(id);
            console.log(`CesiumView.ts: Drone added: ${droneEntity.id}`)
            return true;
        } catch (error) {
            console.error("Failed to add drone - ", error);
            return false;
        }
    }

    updateDronePos(id: string, lon: number, lat: number, alt: number, flightPathEnabled: string = "disabled") {
        if (!this.viewer) {
            return console.error("Viewer is null");
        }
        try {
            const drone = this.entityManager.getControllerByEntityId(id);
            if (drone instanceof DroneController) {
                drone.moveDrone(lon, lat, alt, 0.5);
                if (flightPathEnabled == "enabled") {
                    drone.drawLiveFlightPath(lon, lat, alt);
                }
            }
        } catch (error) {
            console.error("Failed to update drone position - ", error)
        }
    }

    zoomToCoordinates(lon: number, lat: number, height: number, duration: number) {
        if (!this.viewer) {
            return null;
        }
        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
            orientation: {
                heading: Cesium.Math.toRadians(0),    // 0 = north
                pitch: Cesium.Math.toRadians(-90),    // Looking down
                roll: 0
            },
            duration: duration
        });
    }
   
    testpyqtmove(lon: number, lat: number, alt: number) {
        this.droneController?.moveDrone(lon, lat, alt, 10)
    }

    onMoveClicked() {
        this.droneController?.onMoveClicked()
    }

    /* onRotateClicked() {
        this.droneController?.onRotateClicked()
    } */

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
        this.addAntenna2(ANTENNA_LONGITUDE, ANTENNA_LATITUDE, ANTENNA_ALTITUDE, false);
    }

    onAddDroneClicked() {
        const INITIAL_LONGITUDE = 10.325663942903187;
        const INITIAL_LATITUDE = 55.472172681892225;
        const INITIAL_ALTITUDE = 200;
        this.addDrone2(INITIAL_LONGITUDE, INITIAL_LATITUDE, INITIAL_ALTITUDE, true);
        //this.startDroneSimulation();
    }

    public async addDrone2(initialLongitude: number, initialLatitude: number, initialAltitude: number, tracked: boolean) {
        if (!this.viewer) {
            throw new Error("Viewer is null");
        }
        const groundRef = await this.terrain?.setConstantGroundRef(initialLongitude, initialAltitude);
        if (groundRef !== undefined) {
            this.drone = new DroneEntity(this.viewer, "drone-id", Cesium.Cartesian3.fromDegrees(initialLongitude, initialLatitude, initialAltitude + groundRef));
            const droneEntity = this.drone.getEntity()
            const payloadEntity = this.drone.getPayload()
            if (tracked) {
                this.viewer.trackedEntity = droneEntity;
            }
            console.log(`CesiumView.ts: Drone added: ${droneEntity.id}`)
            this.droneController?.setDrone(droneEntity)
            this.droneController?.setPayload(payloadEntity)
            this.droneController?.payloadController.setViewer(this.viewer)
            this.droneController?.setViewer(this.viewer)
        }
    }

    addAntenna2(initialLongitude: number, initialLatitude: number, initialAltitude: number, tracked: boolean) {
        this.antenna = new AntennaEntity("antenna-entity", Cesium.Cartesian3.fromDegrees(initialLongitude, initialLatitude, initialAltitude));
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

    followDrone(drone_id: string, follow: boolean) {
        if (!this.viewer) {
            return;
        }
        if (follow) {
            const drone = this.entityManager.getEntityById(drone_id);
            this.viewer.trackedEntity = drone;
        } else {
            this.viewer.trackedEntity = undefined;
        }
    }

    async toggle3DTiles(enabled: boolean) {
        if (!this.viewer) {
            return;
        }
    
        // If the tileset hasn't been created yet, create and store it
        if (!this.tileset) {
            // "Google photorealistic 3D tileset"
            this.tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
        }
    
        if (enabled) {
            // Add the tileset to the scene if it's enabled and not already added
            if (!this.viewer.scene.primitives.contains(this.tileset)) {
                this.viewer.scene.primitives.add(this.tileset);
                console.log("Added 3D tileset");
            }
        } else {
            // Remove the tileset from the scene if it's disabled and currently added
            if (this.viewer.scene.primitives.contains(this.tileset)) {
                this.viewer.scene.primitives.remove(this.tileset);
                this.tileset = null;
                console.log("Removed 3D tileset");
            }
        }
    }

    updatePayloadOrientationToAntenna(droneId: string) {
        const droneController = this.entityManager.getControllerByEntityId(droneId);
        if (!droneController || !(droneController instanceof DroneController) || !this.trackedAntenna) {
            return;
        }
        const dronePosition = droneController.getCurrentPosCartesian();
        //Currently only support for one antenna. 
        //If more antennas were to be added, the drone and antenna should be associated.
        const antennaPosition = this.trackedAntenna.position?.getValue(Cesium.JulianDate.now());
    
        if (!dronePosition || !antennaPosition) {
            console.error("Drone or Antenna position is undefined!");
            return;
        }
    
        // Compute the direction vector from the drone to the antenna
        const direction = Cesium.Cartesian3.subtract(antennaPosition, dronePosition, new Cesium.Cartesian3());
        Cesium.Cartesian3.normalize(direction, direction); // Normalize the vector
    
        // Create the quaternion to align the payload with the direction vector
        const matrix = Cesium.Transforms.rotationMatrixFromPositionVelocity(dronePosition, direction);
        const quaternion = Cesium.Quaternion.fromRotationMatrix(matrix);
    
        // Update the payload's orientation to point towards the antenna
        droneController.payloadController.updatePayloadOrientation(quaternion);
    }

    payloadTrackAntenna(drone_id: string) {
        if (!this.viewer) {
            console.error("Viewer is undefined");
            return
        }
        this.payloadTrackAntennaCallback = () => {
            this.updatePayloadOrientationToAntenna(drone_id);
            //this.updateOverlay();
        };
        this.viewer.clock.onTick.addEventListener(this.payloadTrackAntennaCallback);
    }

    payloadStopTrackingAntenna() {
        if (this.payloadTrackAntennaCallback && this.viewer) {
            this.viewer.clock.onTick.removeEventListener(this.payloadTrackAntennaCallback);
            this.payloadTrackAntennaCallback = null;
        }
    }

    createFlightPathFromData(
        timestamps: number[],  // Array of UNIX timestamps
        longitudes: number[],  // Array of longitudes in degrees
        latitudes: number[],   // Array of latitudes in degrees
        altitudes: number[],   // Array of altitudes in meters
    ) {
        if (!this.viewer) {
            return;
        }
    
        // Make sure the four arrays are of the same length
        if (timestamps.length !== latitudes.length || timestamps.length !== longitudes.length || timestamps.length !== altitudes.length) {
            console.error("The arrays for time, latitude, longitude, and altitude must have the same length.");
            return;
        }

        const droneEntity = this.viewer.entities.add({
            name: "test",
            point: {
                pixelSize: 10,
                color: Cesium.Color.RED,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            },
            position: new Cesium.SampledPositionProperty(),  // Position will be updated dynamically
        });
    
        this.viewer.trackedEntity = droneEntity;
        this.viewer.clock.shouldAnimate = true;
    
        // Create a SampledPositionProperty to hold the positions over time
        const positionProperty = new Cesium.SampledPositionProperty();
    
        // Loop through the arrays and add each sample to the position property
        for (let i = 0; i < timestamps.length; i++) {
            const time = Cesium.JulianDate.fromDate(new Date(timestamps[i] * 1000));  // Convert UNIX time to JulianDate
            const position = Cesium.Cartesian3.fromDegrees(longitudes[i], latitudes[i], altitudes[i]);
            positionProperty.addSample(time, position);  // Add the time and position sample
        }
    
        // Assign the position property to the entity
        droneEntity.position = positionProperty;
    
        // Set the clock time range based on the first and last times in the arrays
        const startTime = Cesium.JulianDate.fromDate(new Date(timestamps[0] * 1000));
        const endTime = Cesium.JulianDate.fromDate(new Date(timestamps[timestamps.length - 1] * 1000));
        this.viewer.clock.startTime = startTime.clone();
        this.viewer.clock.stopTime = endTime.clone();
        this.viewer.clock.currentTime = startTime.clone();
        this.viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;  // Loop at the end of the flight
        this.viewer.clock.multiplier = 10;
    
        // Fly to the entity's starting position
        const startPosition = droneEntity.position.getValue(startTime);
        if (startPosition) {
            this.viewer.camera.flyTo({
                destination: startPosition,
                orientation: {
                    heading: Cesium.Math.toRadians(0),
                    pitch: Cesium.Math.toRadians(-45),
                    roll: 0,
                },
                duration: 2
            });
        }
    }

    drawDeterminedFlightPath(drone_id: string, lons: number[], lats: number[], alts: number[]) {
        try {
            const drone = this.entityManager.getControllerByEntityId(drone_id);
            if (drone instanceof DroneController) {
                drone.setDeterminedFlightPath(lons, lats, alts);
            }
        } catch (error) {
            console.error("Failed to draw flight path - ", error)
        }
    }

    removeLiveFlightPath(drone_id: string) {
        const drone = this.entityManager.getControllerByEntityId(drone_id);
        if(drone instanceof DroneController) {
            drone.removeLivePath();
        }
    }

    resetLiveFlightPath(drone_id: string) {
        const drone = this.entityManager.getControllerByEntityId(drone_id);
        if (drone instanceof DroneController) {
            drone.resetLivePath();
        }
    }

    removeDeterminedFlightPath(drone_id: string) {
        const drone = this.entityManager.getControllerByEntityId(drone_id);
        if(drone instanceof DroneController) {
            drone.removeDeterminedFlightPath();
        }
    }

    //helper function to calculate heading from direction vector
    calculateHeading(fromPosition: any, toPosition: any): number {
        const direction = Cesium.Cartesian3.subtract(toPosition, fromPosition, new Cesium.Cartesian3());
        return Math.atan2(direction.y, direction.x);
    }

    //helper function to calculate pitch from direction vector
    calculatePitch(fromPosition: any, toPosition: any): number {
        const direction = Cesium.Cartesian3.subtract(toPosition, fromPosition, new Cesium.Cartesian3());
        const flatDistance = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        return Math.atan2(direction.z, flatDistance);
    }

    getViewerInstance() {
        return this.viewer;
    }

    destroy() {
        if (this.viewer) {
            this.viewer.destroy();
            this.viewer = null;
        }
    }

    startDroneSimulation() {
        //hca
        let longitude = 10.3260;
        let latitude = 55.4725;
        let altitude = 100;

        //chile
        /* let longitude = -70.6014607699504;
        let latitude = -28.491158255396414;
        let altitude = 7000; */


    
        let direction = 1; // Controls the direction of horizontal movement (1 for forward, -1 for backward)
        let movingHorizontally = true; // True when moving horizontally, false when moving down
        let movementDuration = 0; // Time counter for how long it's been moving in the current direction
    
        const intervalId = setInterval(() => {
            const power = getRandomPower(); // Generate random power between 0 and 100
    
            if (movingHorizontally) {
                // Move horizontally (forward or backward) for 5 seconds
                if (movementDuration < 5000) {
                    longitude += direction * 0.000005;  // Change in longitude
                    latitude += direction * 0.000005;   // Change in latitude
                } else {
                    // After 5 seconds, switch to vertical movement (down)
                    movingHorizontally = false;
                    movementDuration = 0;  // Reset the duration timer
                }
            } else {
                // Move vertically (down) for 1 second
                if (movementDuration < 1000) {
                    altitude -= 0.2;  // Decrease altitude to simulate going down
                } else {
                    // After 1 second, switch back to horizontal movement
                    movingHorizontally = true;
                    movementDuration = 0;  // Reset the duration timer
    
                    // Reverse direction when going back
                    direction *= -1;  // Switch between forward and backward
                }
            }
    
            // Call the method that updates the drone position and polyline with the new values
            this.droneController.testline(longitude, latitude, altitude, power);
    
            // Update the movement duration timer
            movementDuration += 200; // Increase by the interval time (200ms)
    
        }, 200); // Update every 200 milliseconds
    }
}