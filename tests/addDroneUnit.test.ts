/**
 * @jest-environment jsdom
 */
import { CesiumView } from "../src/views/CesiumView";
import { Viewer } from "cesium";

describe("addDrone Unit testing", () => {
  let cesiumView: CesiumView;

  beforeEach(() => {
    cesiumView = new CesiumView("cesiumContainer");
    cesiumView.viewer = new Viewer("cesiumContainer");
  });

  test("should add a drone", () => {
    const result = cesiumView.addDrone("drone1", 10.0, 20.0, 100.0);
    expect(result).toBe(true);
    const droneEntity = cesiumView.getDroneEntity();
    expect(droneEntity).not.toBeNull();
    if (droneEntity) {
      expect(droneEntity.id).toBe("drone1");
    }
  });
});
