import './styling.css'; //css is injected to html through bundle
import "cesium/Build/Cesium/Widgets/widgets.css";
import { DroneController } from "./controllers/DroneController";
import { CesiumView } from "./views/CesiumView";

(window as any).CESIUM_BASE_URL = '/Cesium/';

async function init() {
    try {
        const view = new CesiumView('cesiumContainer');
        await view.initialize();

        const droneInstance = view.getDroneInstance();
        if (!droneInstance) {
            console.error('Failed to initialize drone.');
            return;
        }

        const droneController = new DroneController(view.getViewerInstance()!, view);

        // btn click events
        const moveBtn = document.getElementById('moveBtn');
        if (moveBtn) {
            moveBtn.addEventListener('click', () => {
                droneController.onMoveClicked();
            });
        }
    } catch (error) {
        console.error('An error occurred during initialization:', error);
    }
}

init();
