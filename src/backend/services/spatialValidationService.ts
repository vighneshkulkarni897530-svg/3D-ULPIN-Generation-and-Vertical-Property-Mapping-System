/**
 * Backend 3D Spatial Validation Service
 * Performs bounding-box intersection, volumetric conflict detection,
 * and 2D/3D cadastral topology validation.
 */

export interface BoundingBox3D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface SpatialConflict {
  targetId: string;
  collidingId: string;
  type: '2D_BOUNDARY_OVERLAP' | '3D_VERTICAL_VOLUME_COLLISION' | 'HEIGHT_VIOLATION';
  severity: 'CRITICAL' | 'WARNING';
  overlapPercentage: number;
  description: string;
}

export class BackendSpatialValidationService {
  /**
   * Tests 3D Axis-Aligned Bounding Box (AABB) intersection between two property units
   */
  static check3dOverlap(boxA: BoundingBox3D, boxB: BoundingBox3D): boolean {
    return (
      boxA.minX < boxB.maxX &&
      boxA.maxX > boxB.minX &&
      boxA.minY < boxB.maxY &&
      boxA.maxY > boxB.minY &&
      boxA.minZ < boxB.maxZ &&
      boxA.maxZ > boxB.minZ
    );
  }

  /**
   * Computes intersection volume of two 3D spatial boundaries
   */
  static computeOverlapVolume(boxA: BoundingBox3D, boxB: BoundingBox3D): number {
    const xOverlap = Math.max(0, Math.min(boxA.maxX, boxB.maxX) - Math.max(boxA.minX, boxB.minX));
    const yOverlap = Math.max(0, Math.min(boxA.maxY, boxB.maxY) - Math.max(boxA.minY, boxB.minY));
    const zOverlap = Math.max(0, Math.min(boxA.maxZ, boxB.maxZ) - Math.max(boxA.minZ, boxB.minZ));
    return xOverlap * yOverlap * zOverlap;
  }

  /**
   * Validates a batch of floor volumes for building compliance
   */
  static validateFloorStack(
    floors: Array<{ floorId: string; floorNumber: number; heightMin: number; heightMax: number }>
  ): SpatialConflict[] {
    const conflicts: SpatialConflict[] = [];

    for (let i = 0; i < floors.length; i++) {
      for (let j = i + 1; j < floors.length; j++) {
        const a = floors[i];
        const b = floors[j];

        if (a.heightMin < b.heightMax && a.heightMax > b.heightMin) {
          conflicts.push({
            targetId: a.floorId,
            collidingId: b.floorId,
            type: '3D_VERTICAL_VOLUME_COLLISION',
            severity: 'CRITICAL',
            overlapPercentage: 100,
            description: `Floor ${a.floorNumber} intersects vertically with Floor ${b.floorNumber}.`,
          });
        }
      }
    }

    return conflicts;
  }
}
