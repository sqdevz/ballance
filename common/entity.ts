import { Body } from "cannon-es";
import { Mesh } from "three";

type PositionType = Body | Mesh;
type RotationType = Body | Mesh;
type Entity = any;

/**
 * The euler rotation on the x, y, z axis of the source is set on the
 * target rotation.
 * @param target
 * @param source
 */
export const setEulerToRotation = (target: Mesh, source: Entity) => {
  target.rotation.set(
    source.eulerRotation.x,
    source.eulerRotation.y,
    source.eulerRotation.z
  );
};

/**
 * Copies the position of the source to the target
 * @param target
 * @param source
 */
export const setPositionByCopy = (
  target: PositionType,
  source: PositionType
) => {
  target.position.set(source.position.x, source.position.y, source.position.z);
};

/**
 * Sets the quaternion of the source to the target
 * @param target
 * @param source
 */
export const setRotationByCopy = (
  target: RotationType,
  source: RotationType
) => {
  target.quaternion.set(
    source.quaternion.x,
    source.quaternion.y,
    source.quaternion.z,
    source.quaternion.w
  );
};
