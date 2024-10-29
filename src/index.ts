import './styling.css';
import "cesium/Build/Cesium/Widgets/widgets.css";
import { CesiumView } from "./views/CesiumView";
import { Terrain } from './flight/Terrain';
import { Viewer } from 'cesium';

(window as any).CESIUM_BASE_URL = "https://cesium.com/downloads/cesiumjs/releases/1.122/Build/Cesium";
const view = new CesiumView('cesiumContainer');
let droneAdded = false;
let antennaAdded = false;
let terrain: Terrain | null = null;
let cesiumView: Viewer | null = null;

async function init() {
    try {
        cesiumView = await view.initialize();
        if (cesiumView !== undefined) {
            terrain = Terrain.getInstance(cesiumView);
        }
    } catch (error) {
        console.error('An error occurred during initialization:', error);
    }
}

function setupEventListeners() {

    const testBtn = document.getElementById("testBtn");
    if (testBtn) {
        testBtn.addEventListener('click', () => {
            init();
        });
    }

    const addDroneBtn = document.getElementById("addDroneBtn");
    if (addDroneBtn) {
        addDroneBtn.addEventListener('click', () => {
            view.onAddDroneClicked();
        });
    }

    const addAntennaBtn = document.getElementById("addAntennaBtn");
    if (addAntennaBtn) {
        addAntennaBtn.addEventListener('click', () => {
            view.onAddAntennaClicked();
        });
    }

    const rollBtn = document.getElementById("rollBtn");
    if (rollBtn) {
        rollBtn.addEventListener('click', () => {
            const rollInput = document.getElementById("rollInput") as HTMLInputElement;
            if (rollInput) {
                const roll = parseFloat(rollInput.value);
                view.setPayloadRoll(roll);
            }
        });
    }

    const pitchBtn = document.getElementById("pitchBtn");
    if (pitchBtn) {
        pitchBtn.addEventListener('click', () => {
            const pitchInput = document.getElementById("pitchInput") as HTMLInputElement;
            if (pitchInput) {
                const pitch = parseFloat(pitchInput.value);
                view.setPayloadPitch(pitch);
            }
        });
    }

    const yawBtn = document.getElementById("yawBtn");
    if (yawBtn) {
        yawBtn.addEventListener('click', () => {
            const yawInput = document.getElementById("yawInput") as HTMLInputElement;
            if (yawInput) {
                const yaw = parseFloat(yawInput.value);
                view.setPayloadYaw(yaw);
            }
        });
    }

    const followDroneBtn = document.getElementById("followDroneBtn") as HTMLInputElement;
    if (followDroneBtn) {
        followDroneBtn.addEventListener("change", function () {
            const id = "QSDRONE"
            if (this.checked) {
                view.followDrone(id, true);
            } else {
                view.followDrone(id, false);
            }
        });
    }

    const toggleTilesBtn = document.getElementById("tilesBtn") as HTMLInputElement;
    if (toggleTilesBtn) {
        toggleTilesBtn.addEventListener("change", function () {
            if (this.checked) {
                view.toggle3DTiles(true);
            } else {
                view.toggle3DTiles(false);
            }
            toggleTilesBtn.disabled = true;
            setTimeout(() => {
                toggleTilesBtn.disabled = false;
              }, 6000);
        });
    }

    const applyCoordinatesBtn = document.getElementById("applyCoordinatesBtn");
    if (applyCoordinatesBtn) {
        applyCoordinatesBtn.addEventListener('click', () => {
            const lonInput = document.getElementById("longitudeInput") as HTMLInputElement;
            const latInput = document.getElementById("latitudeInput") as HTMLInputElement;
            const altInput = document.getElementById("altitudeInput") as HTMLInputElement;
            if (lonInput && latInput && altInput) {
                const lon = parseFloat(lonInput.value);
                const lat = parseFloat(latInput.value);
                const alt = parseFloat(altInput.value);
                view.droneController.setDronePosition(lon, lat, alt);
            }
        });
    }
}

(window as any).move = function(lon: number, lat: number, alt: number) {
    try {
        view.testpyqtmove(lon, lat, alt);
    } catch (error) {
        console.error('Error when trying to move drone - ', error);
    }
};

(window as any).updatePayloadOrientation = function(roll: number, pitch: number, yaw: number) {
    try {
        
    } catch (error) {

    }
};

(window as any).addDrone = async function(id: string, lon: number, lat: number, alt: number) {
    if (terrain) {
        const groundRef = await terrain.setConstantGroundRef(lon, lat);
        if (groundRef !== undefined) {
            try {
                view.addDrone(id, lon, lat, alt + groundRef);
            } catch (error) {
                console.error("Error when trying to add drone - ", error);
            }
        }
    }
};

(window as any).addAntenna = function(id: string, lon: number, lat: number, alt: number) {
    try {
        view.addAntenna(id, lon, lat, alt);
    } catch (error) {
        console.error("Error when trying to add antenna - ", error);
    }
};

(window as any).updateDronePosition = async function(id: string, lon: number, lat: number, alt: number, flightPathEnabled: string = "disabled") {
    //flightPathEnabled: "enabled" || "disabled"
    //const id = "QSDRONE"
    if (terrain && terrain.getConstantGroundRef() != -1) {
        try {
            let realAlt = terrain.getConstantGroundRef() + alt;
            if (!droneAdded) {
                if (view.addDrone(id, lon, lat, realAlt)) {
                    droneAdded = true;
                }
            } else {
                view.updateDronePos(id, lon, lat, realAlt, flightPathEnabled);
            }
        } catch (error) {
            console.error("Error when trying to update drone position - ", error);
        }
    } else if (terrain) {
        terrain.setConstantGroundRef(lon, lat);
    }
};

(window as any).updateAntennaPosition = function(lon: number, lat: number, alt: number) {
    const id = "QSANTENNA"
    try {
        if (!antennaAdded) {
            antennaAdded = true
            view.addAntenna(id, lon, lat, alt);
        } else {
            view.updateAntennaPos(id, lon, lat, alt);
        }
    } catch (error) {
        console.error("Error when trying to update antenna position - ", error);
    }
};

(window as any).setFlightPath = function(
    id: string,
    longitudes: number[], 
    latitudes: number[], 
    altitudes: number[]
) {
    //const id = "QSDRONE";
    view.drawDeterminedFlightPath(id, longitudes, latitudes, altitudes);
};

(window as any).removeLiveFlightPath = function(id: string) {
    //const id = "QSDRONE";
    view.removeLiveFlightPath(id);
};

(window as any).resetLiveFlightPath = function(id: string) {
    //const id = "QSDRONE";
    view.resetLiveFlightPath(id);
};

(window as any).removeDeterminedFlightPath = function(id: string) {
    //const id = "QSDRONE";
    view.removeDeterminedFlightPath(id);
};

(window as any).flyRoute = function(
    timestamps: number[],
    longitudes: number[],
    latitudes: number[],
    altitudes: number[],
) {
    view.createFlightPathFromData(timestamps,longitudes, latitudes, altitudes);
};

(window as any).zoomTo = function(lon: number, lat: number, height: number, duration: number) {
    //duration in seconds
    view.zoomToCoordinates(lon, lat, height, duration);
};

(window as any).initView = function() {
    init();
};

//_______________TESTING_______________//
//init();
setupEventListeners();

//setTimeout(testMove, 5000);

function testMove() {
    const lonList = [10.32580470, 10.32585470, 10.32590470, 10.32595470, 10.32600470, 10.32605470, 10.32610470, 10.32615470, 10.32620470, 10.32625470];
    const latList = [55.47177510, 55.47177550, 55.47177600, 55.47177650, 55.47177700, 55.47177750, 55.47177800, 55.47177850, 55.47177900, 55.47177950];
    const altList = [50, 50, 50, 50, 50, 50, 50, 50, 50, 50];
    const id = "QSDRONE"

    view.addDrone(id, lonList[0], latList[0], altList[0]);
    view.drawDeterminedFlightPath(id, lonList, latList, altList);

    // Define the interval function
    let index = 0;
    const intervalID = setInterval(() => {
        if (index >= lonList.length) {
            clearInterval(intervalID); // Stop after the last location
            //view.removeDeterminedFlightPath(id);
            //view.removeLiveFlightPath(id);
            return;
        }

        // Retrieve the next longitude, latitude, and altitude from the separate lists
        const lon = lonList[index];
        const lat = latList[index];
        const alt = altList[index];

        // Call moveDrone with the coordinates from the lists
        view.updateDronePos(id, lon, lat, alt, "enabled");

        index++; // Increment index to move to the next location
    }, 1000); // 1-second interval
}
