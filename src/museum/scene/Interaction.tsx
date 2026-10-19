'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { closeFocus, focusExhibit, goToRoom, pauseTour, stepExhibit } from '../actions'
import { hasLineOfSight } from '../layout/collision'
import { glideTo, look, player } from '../player'
import { getMuseum, getScene } from '../store'
import { COLORS } from '../theme'

type Hit = { kind: string; id?: string; room?: number; point: THREE.Vector3 }

/** Where the floor cursor should be drawn (shared with <FootCursor/>). */
const hover = { visible: false, x: 0, z: 0 }

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'])

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/**
 * All pointer + keyboard input for the 3D view: drag to look, click to glide or
 * open an exhibit, pointer-lock mouse look in walk mode, WASD / arrows to walk.
 */
export function Interaction() {
  const { gl, camera, scene } = useThree()
  const raycaster = useMemo(() => {
    const r = new THREE.Raycaster()
    r.far = 45
    return r
  }, [])

  useEffect(() => {
    const el = gl.domElement
    el.tabIndex = 0
    el.style.touchAction = 'none'
    el.style.outline = 'none'
    el.setAttribute('aria-label', 'Museum view. Drag to look around, click the floor to move, click a work to view it. WASD or arrow keys to walk.')
    let drag: { id: number; x: number; y: number; moved: number } | null = null
    let hoverQueued = false
    let lastHover: PointerEvent | null = null

    const pick = (clientX: number, clientY: number, center = false): Hit | null => {
      const rect = el.getBoundingClientRect()
      const ndc = center
        ? new THREE.Vector2(0, 0)
        : new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      for (const h of hits) {
        if (!h.object.visible) continue
        let o: THREE.Object3D | null = h.object
        while (o && !o.userData.kind) o = o.parent
        if (!o) return null // first thing hit is a wall / prop: occluded
        return { kind: o.userData.kind, id: o.userData.id, room: o.userData.room, point: h.point }
      }
      return null
    }

    const activate = (hit: Hit | null) => {
      const s = getMuseum()
      if (!hit || !s.layout) return
      if (s.tour.active && !s.tour.paused) pauseTour(true)
      if (hit.kind === 'exhibit' && hit.id) void focusExhibit(hit.id)
      else if (hit.kind === 'kiosk') s.set({ overlay: 'map' })
      else if (hit.kind === 'door' && hit.room !== undefined) {
        const room = s.layout.rooms[hit.room]
        const near = Math.hypot(room.entry.x - player.x, room.entry.z - player.z) < 16
        if (near && hasLineOfSight({ x: player.x, z: player.z }, room.corridor, s.layout)) glideTo(room.entry.x, room.entry.z)
        else goToRoom(hit.room)
      } else if (hit.kind === 'floor' && s.mode === 'glide') {
        glideTo(hit.point.x, hit.point.z)
      }
    }

    const onDown = (e: PointerEvent) => {
      const s = getMuseum()
      if (!s.started || s.overlay || s.transition !== 'idle') return
      el.focus({ preventScroll: true })
      if (s.mode === 'walk' && !document.pointerLockElement && e.pointerType === 'mouse') {
        void el.requestPointerLock?.()
        return
      }
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 }
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
    }

    const onMove = (e: PointerEvent) => {
      const s = getMuseum()
      if (document.pointerLockElement === el) {
        if (!s.focused) look(-e.movementX * 0.0022, -e.movementY * 0.0022)
        return
      }
      if (drag && e.pointerId === drag.id) {
        const dx = e.clientX - drag.x
        const dy = e.clientY - drag.y
        drag.x = e.clientX
        drag.y = e.clientY
        drag.moved += Math.abs(dx) + Math.abs(dy)
        if (drag.moved > 6 && !s.focused) {
          if (s.tour.active && !s.tour.paused) pauseTour(true)
          // "Grab the world" like Street View: drag right turns the view left.
          const f = e.pointerType === 'touch' ? 0.0058 : 0.0038
          look(dx * f, dy * f)
        }
        hover.visible = false
        return
      }
      if (e.pointerType !== 'mouse') return // no hover on touch: saves a raycast per move
      lastHover = e
      if (!hoverQueued) {
        hoverQueued = true
        requestAnimationFrame(() => {
          hoverQueued = false
          if (!lastHover || !getMuseum().started) return
          const hit = getMuseum().focused ? null : pick(lastHover.clientX, lastHover.clientY)
          const clickable = hit && hit.kind !== 'floor'
          el.style.cursor = clickable ? 'pointer' : 'grab'
          hover.visible = !!hit && hit.kind === 'floor' && getMuseum().mode === 'glide'
          if (hit) {
            hover.x = hit.point.x
            hover.z = hit.point.z
          }
        })
      }
    }

    const onUp = (e: PointerEvent) => {
      const s = getMuseum()
      if (document.pointerLockElement === el) {
        if (s.focused) closeFocus()
        else activate(pick(0, 0, true))
        return
      }
      if (!drag || e.pointerId !== drag.id) return
      const wasClick = drag.moved <= 6
      drag = null
      el.style.cursor = 'grab'
      if (!wasClick) return
      if (s.focused) {
        closeFocus()
        return
      }
      activate(pick(e.clientX, e.clientY))
    }

    const onCancel = () => {
      drag = null
      hover.visible = false
    }
    const onLeave = () => {
      hover.visible = false
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const s = getMuseum()
      if (!s.started || s.overlay) return
      const key = e.key.toLowerCase()
      if (MOVE_KEYS.has(key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (s.focused) {
          if (key === 'arrowright' || key === 'd') stepExhibit(1)
          else if (key === 'arrowleft' || key === 'a') stepExhibit(-1)
          else if (key === 'arrowdown' || key === 's') closeFocus()
          e.preventDefault()
          return
        }
        if (s.tour.active && !s.tour.paused) pauseTour(true)
        player.keys.add(key)
        player.glide = null
        e.preventDefault()
      }
      if (e.key === 'Shift') player.run = true
      if (e.key === 'Tab' && document.activeElement === el) {
        e.preventDefault()
        stepExhibit(e.shiftKey ? -1 : 1)
      }
      if (e.key === 'Enter' && document.activeElement === el && !s.focused) {
        // Keyboard users: Enter opens the closest work in view.
        const hit = pick(0, 0, true)
        if (hit?.kind === 'exhibit' && hit.id) void focusExhibit(hit.id)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      player.keys.delete(e.key.toLowerCase())
      if (e.key === 'Shift') player.run = false
    }
    const onBlur = () => {
      player.keys.clear()
      player.run = false
    }
    const onLockChange = () => getMuseum().set({ pointerLocked: document.pointerLockElement === el })

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onCancel)
    el.addEventListener('pointerleave', onLeave)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('pointerlockchange', onLockChange)
    el.style.cursor = 'grab'
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
      el.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('pointerlockchange', onLockChange)
    }
  }, [gl, camera, scene, raycaster])

  return null
}

/** Glowing footprint ring on the floor under the pointer (glide mode). */
export function FootCursor() {
  const ref = useRef<THREE.Group>(null)
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS.cyan).multiplyScalar(2.2), transparent: true, opacity: 0.8, depthWrite: false }),
    [],
  )
  useFrame((state) => {
    const g = ref.current
    if (!g) return
    const s = getMuseum()
    const t = getScene()
    mat.color.set(t.primary).multiplyScalar(t.name === 'day' ? 1 : 2.2)
    g.visible = hover.visible && !s.focused && s.transition === 'idle' && !s.tour.active
    g.position.set(hover.x, 0.02, hover.z)
    const k = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.06
    g.scale.set(k, k, k)
  })
  return (
    <group ref={ref} visible={false}>
      <mesh rotation-x={-Math.PI / 2} material={mat} raycast={() => null}>
        <ringGeometry args={[0.24, 0.3, 40]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} material={mat} raycast={() => null}>
        <circleGeometry args={[0.05, 16]} />
      </mesh>
    </group>
  )
}
