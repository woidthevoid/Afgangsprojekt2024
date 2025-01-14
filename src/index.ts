import './styling.css';
import "cesium/Build/Cesium/Widgets/widgets.css";
import { CesiumView } from "./views/CesiumView";
import { Terrain } from './flight/Terrain';
import { Viewer } from 'cesium';

declare global {
    interface Window {
        addDrone: (id: string, lon: number, lat: number, alt: number) => Promise<void>;
        addAntenna: (id: string, lon: number, lat: number, alt: number, heading?: number, pitch?: number) => void;
        updateDronePosition: (id: string, lon: number, lat: number, alt: number, flightPathEnabled?: string, spectrumData?: number) => Promise<void>;
        updateAntennaPosition: (lon: number, lat: number, alt: number, heading?: number, pitch?: number) => void;
        setFlightPath: (id: string,longitudes: number[], latitudes: number[], altitudes: number[]) => void;
        zoomTo: (lon: number, lat: number, height: number, duration: number) => void;
        removeLiveFlightPath: (id: string) => void;
        resetLiveFlightPath: (id: string) => void;
        removeDeterminedFlightPath: (id: string) => void;
        showScale: (show: string) => void;
        removeEntity: (entity: string) => void;
        viewerFog: (intensity?: number, show?: string) => void;
        initView: (showFps?: string) => void;
    }
}

(window as any).CESIUM_BASE_URL = "https://cesium.com/downloads/cesiumjs/releases/1.122/Build/Cesium";
const view = new CesiumView('cesiumContainer');
let antennaAdded = false;
let terrain: Terrain | null = null;
let cesiumView: Viewer | undefined | null = null;
let isDragging = false;
let startX: number
let startY: number
let hasSetFlightPath = false;

async function init(showFps: boolean = false) {
    try {
        cesiumView = await view.initialize(showFps);
        if (cesiumView !== undefined && cesiumView instanceof Viewer) {
            terrain = Terrain.getInstance(cesiumView);
        }
        const controls = document.getElementById('controls-div');
        if (controls) {
            controls.style.visibility = "visible";
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

    /* const followDroneBtn = document.getElementById("followDroneBtn") as HTMLInputElement;
    if (followDroneBtn) {
        followDroneBtn.addEventListener("change", function () {
            const id = "QSDRONE"
            if (this.checked) {
                view.followDrone(id, true);
            } else {
                view.followDrone(id, false);
            }
        });
    } */

    const droneSelect = document.getElementById("droneSelect") as HTMLSelectElement;
    if (droneSelect) {
        droneSelect.addEventListener("change", function () {
            const selectedId = this.value;
            view.droneSelectionChanged(selectedId);
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

    const joystick = document.getElementById('joystick');
    if (joystick) {
        joystick.addEventListener('mousedown', (event) => {
            isDragging = true;
            startX = event.clientX;
            startY = event.clientY;
            document.body.style.cursor = 'grabbing';
          });
    }

    document.addEventListener('mousemove', (event) => {
        if (!isDragging) {
            return;
        }
      
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
      
        // Camera heading (yaw) adjustment: Rotate the camera left or right
        if (dx !== 0) {
            view.setCameraHeading(dx);
        }
      
        // Camera pitch adjustment: Tilt the camera up or down
        if (dy !== 0) {
          view.setCameraPitch(dy);
        }
      
        startX = event.clientX;
        startY = event.clientY;
      });
      
      document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.cursor = 'default';
      });

    const zoomInBtn = document.getElementById("zoomInBtn") as HTMLInputElement;
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
        view.zoomIn(100);
        });
    }

    const zoomOutBtn = document.getElementById("zoomOutBtn") as HTMLInputElement;
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
        view.zoomOut(100);
        });
    }
}

(window as any).updatePayloadOrientation = function(roll: number, pitch: number, yaw: number) {
    try {
        
    } catch (error) {

    }
};

window.addDrone = async function(id: string, lon: number, lat: number, alt: number) {
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

window.addAntenna = function(id: string, lon: number, lat: number, alt: number, heading: number = 0, pitch: number = 0) {
    try {
        view.addAntenna(id, lon, lat, alt, heading, pitch);
    } catch (error) {
        console.error("Error when trying to add antenna - ", error);
    }
};

window.updateDronePosition = async function(
    id: string, 
    lon: number, 
    lat: number, 
    alt: number, 
    flightPathEnabled: string = "disabled", 
    spectrumData: number | null = null
) {
    //flightPathEnabled: "enabled" || "disabled"
    //const id = "QSDRONE"
    if (terrain && terrain.getGroundRef() != -1) {
        try {
            let realAlt = terrain.getGroundRef() + alt;
            if (!view.entityManager.getEntityById(id)) {
                view.addDrone(id, lon, lat, realAlt);
            } else {
                const spectrumScale = document.getElementById('spectrumScale');
                if (spectrumData != undefined && spectrumScale) {
                    spectrumScale.style.visibility = "visible";
                } /* else if (spectrumScale) {
                    spectrumScale.style.visibility = "hidden";
                } */
                view.updateDronePos(id, lon, lat, realAlt, flightPathEnabled, spectrumData);
            }
            if (!hasSetFlightPath && id == "tle") {
                hasSetFlightPath = true;
                view.setDemoFlightPath();
            }
        } catch (error) {
            console.error("Error when trying to update drone position - ", error);
        }
    } else if (terrain) {
        terrain.setGroundRef(lon, lat);
    }
};

window.updateAntennaPosition = function(lon: number, lat: number, alt: number, heading: number = 0, pitch: number = 0) {
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

window.setFlightPath = function(
    id: string,
    longitudes: number[], 
    latitudes: number[], 
    altitudes: number[]
) {
    //const id = "QSDRONE";
    const groundRef = terrain?.getGroundRef();
    if (groundRef) {
        const updatedAltitudes = altitudes.map(altitude => altitude + groundRef);
        view.drawDeterminedFlightPath(id, longitudes, latitudes, updatedAltitudes);
    }
};

window.removeLiveFlightPath = function(id: string) {
    //const id = "QSDRONE";
    view.removeLiveFlightPath(id);
};

window.resetLiveFlightPath = function(id: string) {
    //const id = "QSDRONE";
    view.resetLiveFlightPath(id);
};

window.removeDeterminedFlightPath = function(id: string) {
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

window.zoomTo = function(lon: number, lat: number, height: number, duration: number) {
    //duration in seconds
    view.zoomToCoordinates(lon, lat, height, duration);
};

window.showScale = function (show: string) {
    const spectrumScale = document.getElementById('spectrumScale');
    if (spectrumScale) {
        if (show == "true") {
            spectrumScale.style.visibility = "visible";
        } else if (show == "false") {
            spectrumScale.style.visibility = "hidden";
        }
    }
};

window.removeEntity = function(id: string) {
    view.removeEntity(id);
}

window.initView = function (showFps: string = "false") {
    if (showFps == "true") {
        init(true);
    } else {
        init(false);
    }
};

window.viewerFog = function (intensity: number = 0.1, show: string = "true") {
    if (show == "true") {
        view.viewerFog(intensity, true);
    } else {
        view.viewerFog(intensity, false);
    }
}

setupEventListeners();

//init();