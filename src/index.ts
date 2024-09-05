import './styling.css'; //css is injected to html through bundle
import "cesium/Build/Cesium/Widgets/widgets.css";
import { CesiumView } from "./views/CesiumView";

(window as any).CESIUM_BASE_URL = '/Cesium/';
const view = new CesiumView('cesiumContainer');

async function init() {
    try {
        await view.initialize();
        setupEventListeners()
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
            view.onAddDroneClicked()
        });
    }
    const rotateBtn = document.getElementById("rotateBtn");
    if (rotateBtn) {
        rotateBtn.addEventListener('click', () => {
            view.onRotateClicked()
        });
    }
    const cancelBtn = document.getElementById("cancelBtn");
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            view.onCancelClicked()
        });
    }
    const rollBtn = document.getElementById("rollBtn");
    if (rollBtn) {
        rollBtn.addEventListener('click', () => {
            const rollInput = document.getElementById("rollInput") as HTMLInputElement;
            if (rollInput) {
                const roll = parseFloat(rollInput.value);
                view.setPayloadRoll(roll)
            }
        });
    }
    const pitchBtn = document.getElementById("pitchBtn");
    if (pitchBtn) {
        pitchBtn.addEventListener('click', () => {
            const pitchInput = document.getElementById("pitchInput") as HTMLInputElement;
            if (pitchInput) {
                const pitch = parseFloat(pitchInput.value);
                view.setPayloadPitch(pitch)
            }
        });
    }
    const yawBtn = document.getElementById("yawBtn");
    if (yawBtn) {
        yawBtn.addEventListener('click', () => {
            const yawInput = document.getElementById("yawInput") as HTMLInputElement;
            if (yawInput) {
                const yaw = parseFloat(yawInput.value);
                view.setPayloadYaw(yaw)
            }
        });
    }
    const trackAntennaBtn = document.getElementById("trackAntennaBtn") as HTMLInputElement;
    if (trackAntennaBtn) {
        trackAntennaBtn.addEventListener("change", function () {
            if (this.checked) {
                view.trackAntenna();
            } else {
                view.stopTrackingAntenna();
            }
        });
    }
}

init();

(window as any).move = function(lon: number, lat: number, alt: number) {
    if (typeof lon === 'number' && typeof lat === 'number' && typeof alt === 'number') {
        view.testpyqtmove(lon, lat, alt);
    } else {
        console.error("Invalid types for lon, lat, or alt");
    }
};