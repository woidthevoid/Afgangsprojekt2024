import './styling.css'; //css is injected to html through bundle
import "cesium/Build/Cesium/Widgets/widgets.css";
import { CesiumView } from "./views/CesiumView";

(window as any).CESIUM_BASE_URL = '/Cesium/';
const view = new CesiumView('cesiumContainer');
let droneAdded = false;
let antennaAdded = false;

async function init() {
    try {
        await view.initialize();
        setupEventListeners();
    } catch (error) {
        console.error('An error occurred during initialization:', error);
    }
}

function setupEventListeners() {
    const moveBtn = document.getElementById('moveBtn');
    if (moveBtn) {
        moveBtn.addEventListener('click', () => {
            view.onMoveClicked();
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
    /* const rotateBtn = document.getElementById("rotateBtn");
    if (rotateBtn) {
        rotateBtn.addEventListener('click', () => {
            view.onRotateClicked();
        });
    } */
    const cancelBtn = document.getElementById("cancelBtn");
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            view.onCancelClicked();
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
    /* const trackAntennaBtn = document.getElementById("trackAntennaBtn") as HTMLInputElement;
    if (trackAntennaBtn) {
        trackAntennaBtn.addEventListener("change", function () {
            if (this.checked) {
                //view.drawPayloadPointingLine();
                view.payloadTrackAntenna();
            } else {
                view.payloadStopTrackingAntenna();
            }
        }); */
    const followDroneBtn = document.getElementById("followDroneBtn") as HTMLInputElement;
    if (followDroneBtn) {
        followDroneBtn.addEventListener("change", function () {
            if (this.checked) {
                view.followDrone(true);
            } else {
                view.followDrone(false);
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

(window as any).addDrone = function(id: string, lon: number, lat: number, alt: number) {
    try {
        view.addDrone(id, lon, lat, alt);
    } catch (error) {
        console.error("Error when trying to add drone - ", error);
    }
};

(window as any).addAntenna = function(id: string, lon: number, lat: number, alt: number) {
    try {
        view.addAntenna(id, lon, lat, alt);
    } catch (error) {
        console.error("Error when trying to add antenna - ", error);
    }
};

(window as any).updateDronePosition = function(lon: number, lat: number, alt: number, flightPath: boolean = false) {
    const id = "QUADSATDRONE";
    try {
        if (!droneAdded) {
            droneAdded = true;
            view.addDrone(id, lon, lat, alt);
        } else {
            view.updateDronePos(id, lon, lat, alt, flightPath);
        }
    } catch (error) {
        console.error("Error when trying to update drone position - ", error);
    }
};

(window as any).updateAntennaPosition = function(lon: number, lat: number, alt: number) {
    const id = "QUADSATANTENNA"
    try {
        if (!antennaAdded) {
            antennaAdded = true
            view.addAntenna(id, lon, lat, alt);
        }
        view.updateAntennaPos(id, lon, lat, alt);
    } catch (error) {
        console.error("Error when trying to update antenna position - ", error);
    }
};

(window as any).setFlightPath = function(
    startPoint: number[], 
    endPoint: number[],
    latitudes: number[], 
    longitudes: number[], 
    altitudes: number[]
) {
    view.drawFlightPath(startPoint, endPoint, latitudes, longitudes, altitudes);
};

(window as any).removeFlightPath = function() {
    view.removeAllFlightPathPoints();
};

(window as any).flyRoute = function(
    timestamps: number[],
    longitudes: number[],
    latitudes: number[],
    altitudes: number[],
) {
    view.createFlightPathFromData(timestamps,longitudes, latitudes, altitudes);
};

(window as any).initView = function() {
    init();
}

init();