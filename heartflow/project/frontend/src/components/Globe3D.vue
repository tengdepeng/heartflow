<template>
  <div ref="containerRef" class="globe3d-container" :class="{ focused: !!focusedPlace }">
    <div v-if="!places.length" class="globe3d-empty">
      <span class="globe3d-empty-icon">🌍</span>
      <p class="globe3d-empty-text">添加带经纬度的地点后，3D 地球将自动标记</p>
    </div>
    <div v-if="webglFailed" class="globe3d-empty">
      <span class="globe3d-empty-icon">🌐</span>
      <p class="globe3d-empty-text">当前环境不支持 WebGL，3D 地球无法渲染，请使用上方足迹星图查看。</p>
    </div>
    <div v-if="focusedPlace" class="globe3d-tooltip">
      <span class="globe3d-tooltip-name">{{ focusedPlace.name }}</span>
      <span class="globe3d-tooltip-city">{{ focusedPlace.city }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

interface GlobePlace {
  id: string
  name: string
  city: string
  lng: number
  lat: number
  type: string
  visitCount: number
}

const props = defineProps<{
  places: GlobePlace[]
}>()

const emit = defineEmits<{
  focus: [id: string]
}>()

const containerRef = ref<HTMLDivElement>()
const focusedPlace = ref<GlobePlace | null>(null)
const webglFailed = ref(false)

// ---- Three.js 场景 ----
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let earth: THREE.Mesh
let markers: THREE.Mesh[] = []
let labelSprites: THREE.Sprite[] = []
let animFrameId: number
let raycaster: THREE.Raycaster
let mouse: THREE.Vector2

const EARTH_RADIUS = 5
const MARKER_RADIUS = 0.15

function latLngToPosition(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * Math.PI / 180
  const theta = (lng + 180) * Math.PI / 180
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const w = canvas.width
  const h = canvas.height

  // 海洋底色
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#0a1628')
  grad.addColorStop(0.3, '#0f1f3a')
  grad.addColorStop(0.5, '#132a4a')
  grad.addColorStop(0.7, '#0f1f3a')
  grad.addColorStop(1, '#0a1628')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // 经纬网格
  ctx.strokeStyle = 'rgba(100, 180, 255, 0.06)'
  ctx.lineWidth = 1
  for (let lat = -90; lat <= 90; lat += 30) {
    const y = (90 - lat) / 180 * h
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  for (let lng = -180; lng <= 180; lng += 30) {
    const x = (lng + 180) / 360 * w
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }

  // 赤道高亮
  ctx.strokeStyle = 'rgba(100, 180, 255, 0.12)'
  ctx.lineWidth = 1.5
  const eqY = h / 2
  ctx.beginPath()
  ctx.moveTo(0, eqY)
  ctx.lineTo(w, eqY)
  ctx.stroke()

  // 大陆轮廓（简化多边形）
  const continents: [number, number][][] = [
    // 欧亚大陆
    [[-10, 60], [0, 65], [20, 70], [40, 65], [60, 70], [80, 75], [100, 70], [120, 65], [130, 60], [140, 55], [145, 50], [140, 45], [130, 40], [120, 35], [110, 30], [100, 25], [95, 20], [90, 25], [80, 30], [75, 35], [70, 40], [60, 45], [50, 50], [40, 55], [30, 55], [20, 50], [10, 50], [0, 50], [-10, 55]],
    // 非洲
    [[-15, 40], [10, 40], [15, 35], [20, 30], [25, 25], [30, 20], [35, 15], [40, 10], [45, 5], [45, 0], [45, -5], [42, -10], [40, -15], [35, -20], [30, -25], [25, -30], [20, -35], [15, -35], [10, -30], [5, -25], [0, -20], [-5, -15], [-10, -10], [-15, -5], [-20, 0], [-20, 5], [-20, 10], [-18, 15], [-18, 20], [-18, 25], [-15, 30], [-15, 35]],
    // 北美洲
    [[-170, 65], [-160, 70], [-140, 70], [-120, 70], [-100, 70], [-80, 70], [-60, 65], [-55, 60], [-50, 55], [-55, 50], [-60, 45], [-65, 40], [-70, 35], [-75, 30], [-80, 25], [-85, 20], [-90, 20], [-95, 25], [-100, 30], [-105, 35], [-110, 40], [-115, 45], [-120, 50], [-125, 55], [-130, 60], [-140, 65], [-150, 65], [-160, 65]],
    // 南美洲
    [[-80, 10], [-75, 10], [-70, 5], [-65, 0], [-60, -5], [-55, -10], [-50, -15], [-45, -20], [-40, -25], [-45, -30], [-50, -35], [-55, -40], [-60, -45], [-65, -50], [-70, -55], [-75, -50], [-70, -45], [-65, -40], [-60, -35], [-55, -30], [-50, -25], [-50, -20], [-55, -15], [-60, -10], [-65, -5], [-70, 0], [-75, 5]],
    // 澳大利亚
    [[115, -15], [120, -15], [130, -15], [140, -15], [145, -20], [150, -25], [150, -30], [145, -35], [140, -40], [135, -35], [130, -30], [125, -25], [120, -20], [115, -20]],
    // 格陵兰
    [[-55, 75], [-45, 80], [-35, 80], [-25, 75], [-20, 70], [-25, 65], [-35, 60], [-45, 60], [-55, 65]],
  ]

  ctx.fillStyle = 'rgba(60, 120, 80, 0.15)'
  for (const continent of continents) {
    ctx.beginPath()
    const first = continent[0]
    const fx = (first[0] + 180) / 360 * w
    const fy = (90 - first[1]) / 180 * h
    ctx.moveTo(fx, fy)
    for (let i = 1; i < continent.length; i++) {
      const px = (continent[i][0] + 180) / 360 * w
      const py = (90 - continent[i][1]) / 180 * h
      ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
  }

  // 海岸线
  ctx.strokeStyle = 'rgba(80, 150, 100, 0.25)'
  ctx.lineWidth = 1
  for (const continent of continents) {
    ctx.beginPath()
    const first = continent[0]
    const fx = (first[0] + 180) / 360 * w
    const fy = (90 - first[1]) / 180 * h
    ctx.moveTo(fx, fy)
    for (let i = 1; i < continent.length; i++) {
      const px = (continent[i][0] + 180) / 360 * w
      const py = (90 - continent[i][1]) / 180 * h
      ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.stroke()
  }

  return new THREE.CanvasTexture(canvas)
}

function createStarfield(): THREE.Points {
  const starsGeo = new THREE.BufferGeometry()
  const count = 3000
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 80 + Math.random() * 40
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
    sizes[i] = 0.3 + Math.random() * 0.7
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starsGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  const starsMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.2,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
  })
  return new THREE.Points(starsGeo, starsMat)
}

function createAtmosphere(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(EARTH_RADIUS * 1.02, 48, 48)
  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec3 viewDir = normalize(-vPosition);
        float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
        rim = pow(rim, 3.0);
        gl_FragColor = vec4(0.4, 0.7, 1.0, rim * 0.35);
      }
    `,
    transparent: true,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  return new THREE.Mesh(geo, mat)
}

function initScene() {
  const container = containerRef.value
  if (!container) return

  const w = container.clientWidth || 400
  const h = container.clientHeight || 400

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200)
  camera.position.set(0, 3, 18)

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  } catch {
    webglFailed.value = true
    return
  }
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.rotateSpeed = 0.5
  controls.minDistance = 8
  controls.maxDistance = 30
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.8
  controls.enablePan = false

  // 星场
  scene.add(createStarfield())

  // 地球
  const texture = createEarthTexture()
  const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64)
  const earthMat = new THREE.MeshPhongMaterial({
    map: texture,
    specular: new THREE.Color(0x222244),
    shininess: 15,
  })
  earth = new THREE.Mesh(earthGeo, earthMat)
  scene.add(earth)

  // 大气层辉光
  scene.add(createAtmosphere())

  // 光照
  const ambient = new THREE.AmbientLight(0x334466, 0.6)
  scene.add(ambient)
  const sun = new THREE.DirectionalLight(0xffffff, 1.2)
  sun.position.set(10, 10, 10)
  scene.add(sun)
  const back = new THREE.DirectionalLight(0x4488ff, 0.3)
  back.position.set(-10, -5, -10)
  scene.add(back)

  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  renderer.domElement.addEventListener('click', onCanvasClick)
  window.addEventListener('resize', onResize)

  animate()
}

function updateMarkers() {
  // 清除旧标记
  for (const m of markers) {
    earth.remove(m)
    m.geometry.dispose()
    ;(m.material as THREE.Material).dispose()
  }
  for (const s of labelSprites) {
    earth.remove(s)
    s.material.map?.dispose()
    ;(s.material as THREE.Material).dispose()
  }
  markers = []
  labelSprites = []

  for (const place of props.places) {
    const pos = latLngToPosition(place.lat, place.lng, EARTH_RADIUS)

    // 标记点
    const markerGeo = new THREE.SphereGeometry(MARKER_RADIUS * (1 + Math.min(place.visitCount, 5) * 0.15), 12, 12)
    const markerMat = new THREE.MeshBasicMaterial({ color: markerColor(place.type) })
    const marker = new THREE.Mesh(markerGeo, markerMat)
    marker.position.copy(pos)
    marker.userData = { placeId: place.id }
    earth.add(marker)
    markers.push(marker)

    // 光晕
    const glowGeo = new THREE.SphereGeometry(MARKER_RADIUS * 2 * (1 + Math.min(place.visitCount, 5) * 0.15), 12, 12)
    const glowMat = new THREE.MeshBasicMaterial({
      color: markerColor(place.type),
      transparent: true,
      opacity: 0.2,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.copy(pos)
    earth.add(glow)
    markers.push(glow)
  }
}

function markerColor(type: string): number {
  const map: Record<string, number> = {
    city: 0x6b9fc4,
    nature: 0x5ab8a0,
    coast: 0x6b9fc4,
    cultural: 0xd4a574,
    abroad: 0xa07c8c,
  }
  return map[type] || 0xc4956a
}

function onCanvasClick(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(markers)

  if (intersects.length > 0) {
    const hit = intersects[0].object
    const placeId = hit.userData.placeId as string | undefined
    if (placeId) {
      const place = props.places.find(p => p.id === placeId)
      if (place) {
        focusedPlace.value = place
        emit('focus', placeId)
        return
      }
    }
  }
  focusedPlace.value = null
}

function onResize() {
  const container = containerRef.value
  if (!container) return
  const w = container.clientWidth
  const h = container.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

function animate() {
  animFrameId = requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

watch(() => props.places.length, () => {
  if (earth) updateMarkers()
})

onMounted(() => {
  initScene()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animFrameId)
  controls?.dispose()
  renderer?.dispose()
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.globe3d-container {
  position: relative;
  width: 100%;
  height: 400px;
  border-radius: 12px;
  overflow: hidden;
  background: radial-gradient(ellipse at center, rgba(15, 25, 50, 0.6), rgba(5, 10, 20, 0.8));
  border: 1px solid rgba(100, 180, 255, 0.08);
  transition: border-color 0.3s;
}
.globe3d-container:hover {
  border-color: rgba(100, 180, 255, 0.15);
}
.globe3d-container.focused {
  border-color: rgba(100, 180, 255, 0.25);
}

.globe3d-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1;
  pointer-events: none;
}
.globe3d-empty-icon {
  font-size: 40px;
  opacity: 0.3;
  margin-bottom: 8px;
}
.globe3d-empty-text {
  font-size: 12px;
  color: rgba(100, 180, 255, 0.3);
  text-align: center;
  max-width: 240px;
}

.globe3d-tooltip {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(10, 18, 40, 0.85);
  border: 1px solid rgba(100, 180, 255, 0.15);
  pointer-events: none;
  animation: fade-in 0.3s ease;
}
.globe3d-tooltip-name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(180, 220, 255, 0.9);
}
.globe3d-tooltip-city {
  font-size: 11px;
  color: rgba(100, 180, 255, 0.5);
}

@keyframes fade-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>