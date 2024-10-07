import { AntennaController } from "../controllers/AntennaController";
import { DroneController } from "../controllers/DroneController";
import { BaseEntity } from "../entities/BaseEntity";

type Entity = BaseEntity;
type Controller = AntennaController | DroneController;

interface EntityControllerPair {
  entity: Entity;
  controller: Controller;
}

export class EntityManager {
  private entityControllerMap: EntityControllerPair[] = [];

  addEntity(entity: Entity, controller: Controller): void {
    this.entityControllerMap.push({ entity, controller });
  }

  getEntityById(id: string): Entity | undefined {
    return this.entityControllerMap.find(pair => pair.entity.id === id)?.entity;
  }

  getControllerByEntityId(id: string): Controller | undefined {
    return this.entityControllerMap.find(pair => pair.entity.id === id)?.controller;
  }

  removeEntityById(id: string): void {
    this.entityControllerMap = this.entityControllerMap.filter(pair => pair.entity.id !== id);
  }

  getAllEntities(): Entity[] {
    return this.entityControllerMap.map(pair => pair.entity);
  }

  getAllControllers(): Controller[] {
    return this.entityControllerMap.map(pair => pair.controller);
  }

  listAllEntitiesWithControllers(): void {
    this.entityControllerMap.forEach((pair, index) => {
      console.log(`Entity ${index + 1} (ID: ${pair.entity.id}):`, pair.entity);
      console.log(`Associated Controller:`, pair.controller);
    });
  }
}
