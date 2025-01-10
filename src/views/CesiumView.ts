import { 
    Viewer, 
    createWorldTerrainAsync, 
    Ion, 
    Cartesian3, 
    JulianDate, 
    Transforms, 
    Quaternion, 
    Cartographic, 
    Math as CesiumMath, 
    HeadingPitchRoll,
    CallbackProperty,
    Color,
    Cesium3DTileset,
    createWorldImageryAsync,
    SampledPositionProperty,
    ClockRange,
    HeightReference,
    Entity,
} from "cesium";
import { DroneEntity } from "../entities/DroneEntity";
import { DroneController } from "../controllers/DroneController";
import { AntennaEntity } from "../entities/AntennaEntity";
import { AntennaController } from "../controllers/AntennaController";
import { EntityManager } from "../managers/EntityManager";

export class CesiumView {
    private tileset: Cesium3DTileset | null = null;
    private viewer: Viewer | null = null;
    private drone: DroneEntity | null = null;
    private antenna: AntennaEntity | null = null;
    private pointingLine: Entity | null = null;
    private payloadTrackAntennaCallback: (() => void) | null = null;
    droneController: DroneController;
    antennaController: AntennaController;
    entityManager: EntityManager;
    trackedAntenna: Entity | null = null;

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
    
        Ion.defaultAccessToken = process.env.CESIUM_ION_TOKEN || '';
        
    
        try {
            console.log("Initializing Cesium viewer...");
            const terrainProvider = await createWorldTerrainAsync();
            this.viewer = new Viewer(this.containerId, {
                terrainProvider: terrainProvider,
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
            //this.viewer.scene.debugShowFramesPerSecond = true;
            const imageryProvider = await createWorldImageryAsync();
            this.viewer.imageryLayers.addImageryProvider(imageryProvider);
            
            console.log("Cesium viewer initialized");
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
    
        //update the camera's position and orientation
        this.viewer.camera.setView({
            destination: cameraOffset,
            orientation: {
                direction: directionToAntenna,
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
            orientation: new HeadingPitchRoll(heading, pitch, 0)
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
                material: Color.RED
            }
        });
    }

    addDroneToDropdown(id: string) {
        const dropdown = document.getElementById("droneSelect") as HTMLSelectElement;
        if (!dropdown) {
            return;
        }
    
        if (Array.from(dropdown.options).some(option => option.value === id)) {
            return;
        }
    
        const option = document.createElement("option");
        option.value = id;
        option.textContent = id;
    
        dropdown.appendChild(option);
    }

    removeDroneFromDropdown(id: string) {
        const dropdown = document.getElementById("droneSelect") as HTMLSelectElement;
        if (!dropdown) {
            return;
        }
    
        const optionToRemove = Array.from(dropdown.options).find(option => option.value === id);
        if (!optionToRemove) {
            return;
        }
    
        dropdown.removeChild(optionToRemove);
    }

    droneSelectionChanged(id: string) {
        if (!this.viewer) {
            return;
        }
        if (id) {
            this.followDrone(id, true);
        } else {
            this.viewer.trackedEntity = undefined;
        }
    }

    addAntenna(id: string, lon: number, lat: number, alt: number, heading: number = 0, pitch: number = 0) {
        if (!this.viewer) {
            throw new Error("Viewer is null");
        }
        const antenna = new AntennaEntity(id, Cartesian3.fromDegrees(lon, lat, alt), heading, pitch);
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

    updateAntennaRotation(heading: number, pitch: number, roll: number) {
        const headingR = CesiumMath.toRadians(heading); // 0 = facing north
        const pitchR = CesiumMath.toRadians(pitch); // y axis
        const rollR = CesiumMath.toRadians(roll); // x axis

        const hpr = new HeadingPitchRoll(headingR, pitchR, rollR);

        const antenna = this.entityManager.getControllerByEntityId("QSANTENNA");
        if (antenna instanceof AntennaController) {
            const position = antenna.getCurrentPosCartesian();
            if (!position) {
                return;
            }
            const orientation = Transforms.headingPitchRollQuaternion(position, hpr);
            antenna.updateAntennaOrientation(orientation);
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
            const drone = new DroneEntity(this.viewer, id, Cartesian3.fromDegrees(lon, lat, alt));
            const droneController = new DroneController()
            const droneEntity = drone.getEntity()
            const payloadEntity = drone.getPayload()
            droneController.setDrone(droneEntity)
            droneController.setPayload(payloadEntity)
            droneController.setViewer(this.viewer)
            droneController.payloadController.setViewer(this.viewer)
            //this.viewer.trackedEntity = droneEntity;
            this.entityManager.addEntity(droneEntity, droneController)
            this.payloadTrackAntenna(id);
            this.addDroneToDropdown(id);
            console.log(`CesiumView.ts: Drone added: ${droneEntity.id}`)
            return true;
        } catch (error) {
            console.error("Failed to add drone - ", error);
            return false;
        }
    }

    updateDronePos(
        id: string, 
        lon: number, 
        lat: number, 
        alt: number, 
        flightPathEnabled: string = "disabled", 
        spectrumData: number | null = null, 
        showDistance: boolean = false
    ) {
        if (!this.viewer) {
            return console.error("Viewer is null");
        }
        try {
            const drone = this.entityManager.getControllerByEntityId(id);
            if (drone instanceof DroneController) {
                drone.moveDrone(lon, lat, alt, 0.3);
                if (flightPathEnabled == "enabled") {
                    drone.drawLiveFlightPath(lon, lat, alt, spectrumData);
                }
                if (showDistance) {
                    drone.drawDistanceLine(lon, lat, alt);
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
            destination: Cartesian3.fromDegrees(lon, lat, height),
            orientation: {
                heading: CesiumMath.toRadians(0),    // 0 = north
                pitch: CesiumMath.toRadians(-90),    // Looking down
                roll: 0
            },
            duration: duration
        });
    }

    removeEntity(id: string) {
        if (!this.viewer) {
            return;
        }
        const entity = this.entityManager.getEntityById(id);
        if (entity) {
            this.viewer.entities.remove(entity);
        }
    }

    setCameraPitch(dy: number) {
        if(!this.viewer) {
            return;
        }
        this.viewer.camera.setView({
            orientation: {
            heading: this.viewer.camera.heading,
            pitch: this.viewer.camera.pitch - CesiumMath.toRadians(dy * 0.1), // Adjust 0.1 for tilt speed
            roll: this.viewer.camera.roll,
            },
        });
    }

    setCameraHeading(dx: number) {
        if(!this.viewer) {
            return;
        }
        this.viewer.camera.setView({
            orientation: {
            heading: this.viewer.camera.heading - CesiumMath.toRadians(dx * 0.1), // Adjust 0.1 for rotation speed
            pitch: this.viewer.camera.pitch,
            roll: this.viewer.camera.roll,
            },
        });
    }

    zoomIn(zoomAmount: number) {
        if (!this.viewer) {
            return;
        }
        this.viewer.camera.zoomIn(zoomAmount);
    }

    zoomOut(zoomAmount: number) {
        if (!this.viewer) {
            return;
        }
        this.viewer.camera.zoomOut(zoomAmount);
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
        const INITIAL_ALTITUDE = 60;
        this.addDrone2(INITIAL_LONGITUDE, INITIAL_LATITUDE, INITIAL_ALTITUDE, false);
        this.startDroneSimulation();
    }

    public async addDrone2(initialLongitude: number, initialLatitude: number, initialAltitude: number, tracked: boolean) {
        if (!this.viewer) {
            throw new Error("Viewer is null");
        }
        const testdroneid = "drone-id"
        this.drone = new DroneEntity(this.viewer, testdroneid, Cartesian3.fromDegrees(initialLongitude, initialLatitude, initialAltitude));
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
        this.entityManager.addEntity(this.drone.getEntity(), this.droneController)
        this.payloadTrackAntenna(testdroneid);
        this.addDroneToDropdown(testdroneid);

        const lons: number[] = [];
        const lats: number[] = [];
        const alts: number[] = [];

        const radius = 0.001;
        const altitudeVariation = 5;

        for (let i = 0; i <= 36; i++) {
            const angle = (i * 10) * (Math.PI / 180); // Convert to radians

            const newLon = initialLongitude + radius * Math.cos(angle);
            const newLat = initialLatitude + radius * Math.sin(angle);
            const newAlt = 50 + initialAltitude + altitudeVariation * Math.sin(angle);

            lons.push(newLon);
            lats.push(newLat);
            alts.push(newAlt);
        }
        //this.droneController.setDeterminedFlightPath(lons,lats,alts);
    }

    addAntenna2(initialLongitude: number, initialLatitude: number, initialAltitude: number, tracked: boolean) {
        this.antenna = new AntennaEntity("antenna-entity", Cartesian3.fromDegrees(initialLongitude, initialLatitude, initialAltitude));
        const antennaEntity = this.antenna.getEntity()
        this.trackedAntenna = antennaEntity
        if (this.viewer) {
            this.viewer.entities.add(antennaEntity);
            if (tracked) {
            this.viewer.trackedEntity = antennaEntity;
            }
        }
        console.log(`CesiumView.ts: Antenna added: ${antennaEntity.id}`)
        this.antennaController.setAntenna(this.antenna.getEntity());
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
            this.tileset = await Cesium3DTileset.fromIonAssetId(2275207);
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
        const antennaPosition = this.trackedAntenna.position?.getValue(JulianDate.now());
    
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
        droneController.payloadController.updatePayloadOrientation(quaternion);
    }

    payloadTrackAntenna(drone_id: string) {
        if (!this.viewer) {
            console.error("Viewer is undefined");
            return;
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
                color: Color.RED,
                outlineColor: Color.WHITE,
                outlineWidth: 2,
                heightReference: HeightReference.RELATIVE_TO_GROUND,
            },
            position: new SampledPositionProperty(),  // Position will be updated dynamically
        });
    
        this.viewer.trackedEntity = droneEntity;
        this.viewer.clock.shouldAnimate = true;
    
        // Create a SampledPositionProperty to hold the positions over time
        const positionProperty = new SampledPositionProperty();
    
        // Loop through the arrays and add each sample to the position property
        for (let i = 0; i < timestamps.length; i++) {
            const time = JulianDate.fromDate(new Date(timestamps[i] * 1000));  // Convert UNIX time to JulianDate
            const position = Cartesian3.fromDegrees(longitudes[i], latitudes[i], altitudes[i]);
            positionProperty.addSample(time, position);  // Add the time and position sample
        }
    
        // Assign the position property to the entity
        droneEntity.position = positionProperty;
    
        // Set the clock time range based on the first and last times in the arrays
        const startTime = JulianDate.fromDate(new Date(timestamps[0] * 1000));
        const endTime = JulianDate.fromDate(new Date(timestamps[timestamps.length - 1] * 1000));
        this.viewer.clock.startTime = startTime.clone();
        this.viewer.clock.stopTime = endTime.clone();
        this.viewer.clock.currentTime = startTime.clone();
        this.viewer.clock.clockRange = ClockRange.LOOP_STOP;  // Loop at the end of the flight
        this.viewer.clock.multiplier = 10;
    
        // Fly to the entity's starting position
        const startPosition = droneEntity.position.getValue(startTime);
        if (startPosition) {
            this.viewer.camera.flyTo({
                destination: startPosition,
                orientation: {
                    heading: CesiumMath.toRadians(0),
                    pitch: CesiumMath.toRadians(-45),
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

    getViewerInstance() {
        return this.viewer;
    }

    destroy() {
        if (this.viewer) {
            this.viewer.destroy();
            this.viewer = null;
        }
    }

    getRandomPower(): number {
        return Math.floor(Math.random() * 1001);
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


    
        let direction = 1; // Direction of horizontal movement (1 for forward, -1 for backward)
        let movingHorizontally = true; // True when moving horizontally, false when moving down
        let movementDuration = 0; // Time counter for how long it's been moving in the current direction
    
        const intervalId = setInterval(() => {
            const power = this.getRandomPower(); // Generate random power between 0 and 100
    
            if (movingHorizontally) {
                // Move horizontally for 5 seconds
                if (movementDuration < 5000) {
                    longitude += direction * 0.000005;  // +- longitude
                    latitude += direction * 0.000005;   // +- latitude
                } else {
                    // After 5 seconds, switch to vertical movement
                    movingHorizontally = false;
                    movementDuration = 0;  // Reset the duration timer
                }
            } else {
                // Move vertically for 1 second
                if (movementDuration < 1000) {
                    altitude -= 0.2;  // go down 0.2
                } else {
                    // After 1 second, switch back to horizontal movement
                    movingHorizontally = true;
                    movementDuration = 0;  // Reset the duration timer
    
                    // Reverse direction when going back
                    direction *= -1;  // Switch between forward and backward
                }
            }
    
            // Update the drone position and polyline with the new values
            this.droneController.testline(longitude, latitude, altitude, power);
    
            // Update the movement duration timer
            movementDuration += 200; // Increase by the interval time (200ms)
    
        }, 200); // Update every 200 milliseconds
    }
}