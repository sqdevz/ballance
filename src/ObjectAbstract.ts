import { Body, Box, Cylinder, Sphere, Vec3 } from 'cannon-es'
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Mesh,
  SphereGeometry,
  Material,
} from 'three'
import {
  setEulerToRotation,
  setPositionByCopy,
  setRotationByCopy,
} from '../common/entity'

export interface AbstractObject {
  geometry: BufferGeometry
  mesh: Mesh
  physics_body: Body

  setupMesh: (entity: any, bodyOptions: any) => void
  setupPhysics: (entity: any, bodyOptions: any) => void
}

export class BoxObject implements AbstractObject {
  geometry: BoxGeometry
  mesh!: Mesh
  physics_body!: Body

  constructor(entity: any, material: Material, bodyOptions?: any) {
    this.geometry = new BoxGeometry(
      entity.shape.halfExtents.x * 2,
      entity.shape.halfExtents.y * 2,
      entity.shape.halfExtents.z * 2,
    )
    this.setupMesh(entity, material)
    this.setupPhysics(entity, bodyOptions)
  }

  setupPhysics = (entity: any, bodyOptions: any) => {
    this.physics_body = new Body(bodyOptions)
    const cubeShape = new Box(
      new Vec3(
        entity.shape.halfExtents.x,
        entity.shape.halfExtents.y,
        entity.shape.halfExtents.z,
      ),
    )
    this.physics_body.addShape(cubeShape)
    setPositionByCopy(this.physics_body, this.mesh)
    setRotationByCopy(this.physics_body, this.mesh)
  }

  setupMesh = (entity: any, material: Material) => {
    this.mesh = new Mesh(this.geometry, material)
    setPositionByCopy(this.mesh, entity)
    setEulerToRotation(this.mesh, entity)
    this.mesh.castShadow = true
  }
}

export class CylinderObject implements AbstractObject {
  geometry: CylinderGeometry
  mesh!: Mesh
  physics_body!: Body

  constructor(entity: any, material: Material, bodyOptions?: any) {
    this.geometry = new CylinderGeometry(
      entity.shape.radius,
      entity.shape.radius,
      entity.shape.halfLength * 2,
      16,
    )
    this.setupMesh(entity, material)
    this.setupPhysics(entity, bodyOptions)
  }

  setupMesh = (entity: any, material: Material) => {
    this.mesh = new Mesh(this.geometry, material)
    setPositionByCopy(this.mesh, entity)
    setEulerToRotation(this.mesh, entity)
    this.mesh.castShadow = true
  }

  setupPhysics = (entity: any, bodyOptions: any = null) => {
    if (bodyOptions === null) {
      bodyOptions = { isTrigger: true }
    }
    this.physics_body = new Body(bodyOptions)
    const cylinderShape = new Cylinder(
      entity.shape.radius,
      entity.shape.radius,
      entity.shape.halfLength * 2,
      16,
    )
    // Unsure why second argument
    this.physics_body.addShape(cylinderShape, new Vec3())
    setPositionByCopy(this.physics_body, this.mesh)
    setRotationByCopy(this.physics_body, this.mesh)
  }
}

export class SphereObject implements AbstractObject {
  geometry: SphereGeometry
  mesh!: Mesh
  physics_body!: Body

  constructor(entity: any, material: Material, bodyOptions?: any) {
    this.geometry = new SphereGeometry(entity.shape.radius)
    this.setupMesh(entity, material)
    this.setupPhysics(entity, bodyOptions)
  }

  setupMesh = (entity: any, material: any) => {
    this.mesh = new Mesh(this.geometry, material)
    setPositionByCopy(this.mesh, entity)
    setEulerToRotation(this.mesh, entity)
    this.mesh.castShadow = true
  }

  setupPhysics = (entity: any, bodyOptions: any = null) => {
    if (bodyOptions === null) {
      bodyOptions = { isTrigger: true }
    }
    this.physics_body = new Body(bodyOptions)
    const cylinderShape = new Sphere(entity.shape.radius)
    // Unsure why second argument
    this.physics_body.addShape(cylinderShape)
    setPositionByCopy(this.physics_body, this.mesh)
    setRotationByCopy(this.physics_body, this.mesh)
  }
}
