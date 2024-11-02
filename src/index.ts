import './styling.css';
import "cesium/Build/Cesium/Widgets/widgets.css";
import { CesiumView } from "./views/CesiumView";
import { Terrain } from './flight/Terrain';
import { Viewer } from 'cesium';

(window as any).CESIUM_BASE_URL = "https://cesium.com/downloads/cesiumjs/releases/1.122/Build/Cesium";
const view = new CesiumView('cesiumContainer');
let antennaAdded = false;
let terrain: Terrain | null = null;
let cesiumView: Viewer | undefined | null = null;

async function init() {
    try {
        cesiumView = await view.initialize();
        if (cesiumView !== undefined && cesiumView instanceof Viewer) {
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
}

(window as any).updatePayloadOrientation = function(roll: number, pitch: number, yaw: number) {
    try {
        
    } catch (error) {

    }
};

(window as any).addDrone = async function(id: string, lon: number, lat: number, alt: number) {
    if (terrain) {
        const groundRef = await terrain.setGroundRef(lon, lat);
        if (groundRef !== undefined) {
            try {
                view.addDrone(id, lon, lat, alt + groundRef);
            } catch (error) {
                console.error("Error when trying to add drone - ", error);
            }
        }
    }
};

(window as any).addAntenna = function(id: string, lon: number, lat: number, alt: number, heading: number = 0, pitch: number = 0) {
    try {
        view.addAntenna(id, lon, lat, alt, heading, pitch);
    } catch (error) {
        console.error("Error when trying to add antenna - ", error);
    }
};

(window as any).updateDronePosition = async function(
    id: string, 
    lon: number, 
    lat: number, 
    alt: number, 
    flightPathEnabled: string = "disabled", 
    power: number | null = null
) {
    //flightPathEnabled: "enabled" || "disabled"
    //const id = "QSDRONE"
    if (terrain && terrain.getGroundRef() != -1) {
        try {
            let realAlt = terrain.getGroundRef() + alt;
            if (!view.entityManager.getEntityById(id)) {
                view.addDrone(id, lon, lat, realAlt);
            } else {
                const powerScale = document.getElementById('powerScale');
                if (power != null && powerScale) {
                    powerScale.style.visibility = "visible";
                } else if (powerScale) {
                    powerScale.style.visibility = "hidden";
                }
                view.updateDronePos(id, lon, lat, realAlt, flightPathEnabled, power);
            }
        } catch (error) {
            console.error("Error when trying to update drone position - ", error);
        }
    } else if (terrain) {
        terrain.setGroundRef(lon, lat);
    }
};

(window as any).updateAntennaPosition = function(lon: number, lat: number, alt: number, heading: number = 0, pitch: number = 0) {
    const id = "QSANTENNA"
    try {
        if (!antennaAdded) {
            antennaAdded = true
            view.addAntenna(id, lon, lat, alt, heading, pitch);
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

(window as any).showScale = function (show: string) {
    const powerScale = document.getElementById('powerScale');
    if (powerScale) {
        if (show == "true") {
            powerScale.style.visibility = "visible";
        } else if (show == "false") {
            powerScale.style.visibility = "hidden";
        }
    }
};

(window as any).initView = function () {
    init();
};

setupEventListeners();


