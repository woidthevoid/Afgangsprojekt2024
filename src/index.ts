import './styling.css';
import "cesium/Build/Cesium/Widgets/widgets.css";
import { CesiumView } from "./views/CesiumView";
import { Terrain } from './flight/Terrain';
import { Viewer } from 'cesium';

(window as any).CESIUM_BASE_URL = "https://cesium.com/downloads/cesiumjs/releases/1.122/Build/Cesium";
const view = new CesiumView('cesiumContainer');
(window as any).view = view;
let antennaAdded = false;
let terrain: Terrain | null = null;
let cesiumView: Viewer | undefined | null = null;
let isDragging = false;
let startX: number
let startY: number

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
                if (spectrumData != null && spectrumScale) {
                    spectrumScale.style.visibility = "visible";
                } else if (spectrumScale) {
                    spectrumScale.style.visibility = "hidden";
                }
                view.updateDronePos(id, lon, lat, realAlt, flightPathEnabled, spectrumData);
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
    const spectrumScale = document.getElementById('spectrumScale');
    if (spectrumScale) {
        if (show == "true") {
            spectrumScale.style.visibility = "visible";
        } else if (show == "false") {
            spectrumScale.style.visibility = "hidden";
        }
    }
};

(window as any).initView = function () {
    init();
};

setupEventListeners();

init();
