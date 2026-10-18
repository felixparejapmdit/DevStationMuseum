'use client'
import { Grid, MeshReflectorMaterial } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { site } from '@/site.config'
import { DIMS, wallWithGaps, type MuseumLayout } from '../layout/layoutMuseum'
import { getMuseum, useMuseum } from '../store'
import { player } from '../player'
import { COLORS } from '../theme'
import { Exhibit } from './Exhibit'
import { additive, coneTexture, MAT, neon, noRaycast } from './materials'
import { Block, Label, NeonBar, NeonText, Plant } from './primitives'

const { hall, rotunda, gallery, room } = DIMS

// ── Floor ──────────────────────────────────────────────────────────────────
export function InteriorFloor({ layout }: { layout: MuseumLayout }) {
  const tier = useMuseum((s) => s.tier)
  const z0 = hall.z0
  const z1 = layout.galleryEndZ - 1
  const length = z0 - z1
  const position: [number, number, number] = [0, 0, (z0 + z1) / 2]
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={position} userData={{ kind: 'floor' }}>
        <planeGeometry args={[32, length]} />
        {tier === 'high' ? (
          <MeshReflectorMaterial
            blur={[240, 70]}
            resolution={512}
            mixBlur={1}
            mixStrength={10}
            mixContrast={1.1}
            roughness={0.85}
            depthScale={1.1}
            minDepthThreshold={0.35}
            maxDepthThreshold={1.3}
            color="#0a0b12"
            metalness={0.55}
            mirror={0.6}
          />
        ) : (
          <meshStandardMaterial color="#0b0c14" roughness={0.42} metalness={0.2} envMapIntensity={0.28} />
        )}
      </mesh>
      <Grid
        position={[0, 0.003, position[2]]}
        args={[32, length]}
        cellSize={1.2}
        cellThickness={0.6}
        cellColor="#161a2c"
        sectionSize={0}
        fadeDistance={36}
        fadeStrength={1.2}
        raycast={noRaycast}
      />
    </group>
  )
}

// ── Entrance hall ─────────────────────────────────────────────────────────
function Arch({ z, color }: { z: number; color: string }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.06) }), [color])
  const base = useMemo(() => new THREE.Color(color), [color])
  const on = useRef(0)
  useFrame((_, dt) => {
    const near = getMuseum().started && Math.abs(player.z - z) < 7 && Math.abs(player.x) < 6
    on.current += ((near ? 1 : 0.15) - on.current) * Math.min(1, dt * 2.5)
    mat.color.copy(base).multiplyScalar(0.06 + 2.8 * on.current)
  })
  const top = hall.h - 0.04
  return (
    <group position={[0, 0, z]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (hall.halfW - 0.03), top - 0.6, 0]} material={mat}>
          <boxGeometry args={[0.04, 1.2, 0.05]} />
        </mesh>
      ))}
      <mesh position={[0, top, 0]} material={mat}>
        <boxGeometry args={[hall.halfW * 2, 0.04, 0.05]} />
      </mesh>
    </group>
  )
}

function EntranceHall({ works, rooms }: { works: number; rooms: number }) {
  const len = hall.z0 - hall.z1
  const midZ = (hall.z0 + hall.z1) / 2
  return (
    <group>
      {[-1, 1].map((s) => (
        <Block key={s} size={[0.3, hall.h, len]} position={[s * (hall.halfW + 0.15), hall.h / 2, midZ]} material={MAT.wall()} />
      ))}
      <mesh position={[0, hall.h, midZ]} rotation-x={Math.PI / 2} material={MAT.ceiling()}>
        <planeGeometry args={[hall.halfW * 2, len]} />
      </mesh>
      {[6.6, 4.4, 2.2, 0, -2.2, -4.4].map((z, i) => (
        <Arch key={z} z={z} color={i % 2 ? COLORS.magenta : COLORS.cyan} />
      ))}
      {[-1, 1].map((s) => (
        <NeonBar key={s} size={[0.02, 0.035, len]} position={[s * (hall.halfW - 0.01), 0.03, midZ]} color={COLORS.violet} intensity={2} />
      ))}

      {/* Left wall: about the maker */}
      <group position={[-hall.halfW + 0.02, 0, 1.4]} rotation-y={Math.PI / 2}>
        <Label font="mono" fontSize={0.13} color={COLORS.cyan} letterSpacing={0.3} anchorX="left" position={[-2.6, 3.35, 0]}>
          HELLO, I&apos;M
        </Label>
        <Label font="display" fontSize={0.52} color="#f2f4fb" anchorX="left" position={[-2.6, 2.9, 0]}>
          {site.name}
        </Label>
        <NeonText color={COLORS.magenta} font="displayMedium" fontSize={0.2} anchorX="left" position={[-2.6, 2.45, 0]} intensity={2}>
          {site.role}
        </NeonText>
        {site.about.map((line, i) => (
          <Label key={i} fontSize={0.12} color="#a9b1c6" anchorX="left" anchorY="top" maxWidth={5.2} lineHeight={1.45} position={[-2.6, 2.12 - i * 0.62, 0]}>
            {line}
          </Label>
        ))}
      </group>

      {/* Right wall: the collection */}
      <group position={[hall.halfW - 0.02, 0, 1.4]} rotation-y={-Math.PI / 2}>
        <Label font="mono" fontSize={0.13} color={COLORS.violet} letterSpacing={0.3} anchorX="left" position={[-2.6, 3.35, 0]}>
          THE COLLECTION
        </Label>
        <NeonText color={COLORS.cyan} fontSize={0.44} anchorX="left" position={[-2.6, 2.9, 0]}>
          {site.museumName}
        </NeonText>
        <Label font="mono" fontSize={0.15} color="#e8ebf5" anchorX="left" letterSpacing={0.12} position={[-2.6, 2.4, 0]}>
          {`${works} WORKS  ·  ${rooms} ROOMS`}
        </Label>
        <Label fontSize={0.12} color="#a9b1c6" anchorX="left" anchorY="top" maxWidth={5.2} lineHeight={1.45} position={[-2.6, 2.1, 0]}>
          {site.tagline}
        </Label>
        <Label font="mono" fontSize={0.095} color="#7d859b" anchorX="left" position={[-2.6, 1.45, 0]} letterSpacing={0.08}>
          M  MAP   ·   CTRL/⌘ K  SEARCH   ·   T  GUIDED TOUR
        </Label>
      </group>
    </group>
  )
}

// ── Rotunda ───────────────────────────────────────────────────────────────
function Sculpture() {
  const group = useRef<THREE.Group>(null)
  const ringA = useRef<THREE.Mesh>(null)
  const ringB = useRef<THREE.Mesh>(null)
  const beam = useMemo(() => additive(coneTexture(), COLORS.violet, 0.12), [])
  useFrame((state, dt) => {
    if (getMuseum().reducedMotion) return
    const t = state.clock.elapsedTime
    if (group.current) {
      group.current.rotation.y += dt * 0.25
      group.current.position.y = 2.7 + Math.sin(t * 0.8) * 0.08
    }
    if (ringA.current) ringA.current.rotation.x = t * 0.5
    if (ringB.current) ringB.current.rotation.z = t * 0.35
  })
  return (
    <group position={[rotunda.cx, 0, rotunda.cz]}>
      <mesh position={[0, 0.35, 0]} material={MAT.darkMetal()}>
        <cylinderGeometry args={[1.3, 1.4, 0.7, 48]} />
      </mesh>
      <mesh position={[0, 0.71, 0]} rotation-x={Math.PI / 2} material={neon(COLORS.violet, 2.4)}>
        <torusGeometry args={[1.3, 0.015, 8, 64]} />
      </mesh>
      <group ref={group} position={[0, 2.7, 0]}>
        <mesh material={MAT.darkMetal()}>
          <icosahedronGeometry args={[0.62, 0]} />
        </mesh>
        <mesh scale={1.02}>
          <icosahedronGeometry args={[0.62, 0]} />
          <meshBasicMaterial wireframe color={new THREE.Color(COLORS.cyan).multiplyScalar(2.6)} />
        </mesh>
        <mesh ref={ringA} material={neon(COLORS.magenta, 2.6)}>
          <torusGeometry args={[1.05, 0.012, 8, 96]} />
        </mesh>
        <mesh ref={ringB} material={neon(COLORS.cyan, 2.4)}>
          <torusGeometry args={[1.25, 0.01, 8, 96]} />
        </mesh>
      </group>
      <mesh position={[0, 4.2, 0]} material={beam} raycast={noRaycast}>
        <cylinderGeometry args={[0.7, 1.2, 7, 32, 1, true]} />
      </mesh>
    </group>
  )
}

function Directory({ layout }: { layout: MuseumLayout }) {
  const rows = layout.rooms.slice(0, 11)
  const rest = layout.rooms.length - rows.length
  const hit = { kind: 'kiosk' }
  return (
    <group position={[rotunda.cx + rotunda.r - 0.55, 0, rotunda.cz]} rotation-y={-Math.PI / 2}>
      <mesh position={[0, 2.3, 0]} material={MAT.plaque()} userData={hit}>
        <boxGeometry args={[3.6, 3.0, 0.08]} />
      </mesh>
      <NeonBar size={[3.66, 0.02, 0.02]} position={[0, 3.81, 0.05]} color={COLORS.cyan} intensity={2.4} />
      <NeonBar size={[3.66, 0.02, 0.02]} position={[0, 0.79, 0.05]} color={COLORS.cyan} intensity={2.4} />
      <Label font="mono" fontSize={0.1} color={COLORS.cyan} letterSpacing={0.3} anchorX="left" position={[-1.6, 3.6, 0.05]}>
        DIRECTORY
      </Label>
      <Label font="display" fontSize={0.2} color="#f2f4fb" anchorX="left" position={[-1.6, 3.35, 0.05]}>
        The Grand Gallery
      </Label>
      {rows.map((r, i) => (
        <group key={r.room.id} position={[-1.6, 3.02 - i * 0.19, 0.05]}>
          <Label font="mono" fontSize={0.085} color={r.room.accent} anchorX="left">
            {String(i + 1).padStart(2, '0')}
          </Label>
          <Label fontSize={0.095} color="#d7dcea" anchorX="left" position={[0.3, 0, 0]}>
            {r.room.title}
          </Label>
          <Label font="mono" fontSize={0.075} color="#7d859b" anchorX="right" position={[3.2, 0, 0]}>
            {`${r.side < 0 ? 'LEFT' : 'RIGHT'} · ${r.exhibits.length}`}
          </Label>
        </group>
      ))}
      {rest > 0 && (
        <Label fontSize={0.085} color="#8b93a8" anchorX="left" position={[-1.6, 3.02 - rows.length * 0.19, 0.05]}>
          {`…and ${rest} more rooms`}
        </Label>
      )}
      <Label font="mono" fontSize={0.075} color="#8b93a8" letterSpacing={0.12} position={[0, 0.62, 0.05]}>
        SELECT TO OPEN THE MAP
      </Label>
    </group>
  )
}

function Rotunda({ layout, works }: { layout: MuseumLayout; works: number }) {
  const projects = useMuseum((s) => s.projects)
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.9, side: THREE.BackSide }), [])
  const domeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: COLORS.ceiling, roughness: 0.95, side: THREE.BackSide }), [])
  const southHalf = Math.asin(hall.halfW / rotunda.r)
  const northHalf = Math.asin(gallery.halfW / rotunda.r)
  const R = rotunda.r
  const H = rotunda.h
  const arcs: [number, number, number, number][] = [
    // thetaStart, thetaLength, yBottom, yTop
    [southHalf, Math.PI - northHalf - southHalf, 0, H],
    [Math.PI + northHalf, Math.PI - northHalf - southHalf, 0, H],
    [-southHalf, 2 * southHalf, hall.h, H],
    [Math.PI - northHalf, 2 * northHalf, gallery.h, H],
  ]
  const featuredProject = layout.featured ? projects[layout.featured.slug] : null
  const featuredRoom = layout.featured ? layout.rooms.find((r) => r.exhibits.some((e) => e.slug === layout.featured!.slug)) : null

  return (
    <group>
      {arcs.map(([start, length, y0, y1], i) => (
        <mesh key={i} position={[rotunda.cx, (y0 + y1) / 2, rotunda.cz]} material={wallMat}>
          <cylinderGeometry args={[R, R, y1 - y0, 64, 1, true, start, length]} />
        </mesh>
      ))}
      <mesh position={[rotunda.cx, H, rotunda.cz]} scale={[1, 0.42, 1]} material={domeMat}>
        <sphereGeometry args={[R, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[rotunda.cx, H - 0.03, rotunda.cz]} rotation-x={Math.PI / 2} material={neon(COLORS.magenta, 2.2)}>
        <torusGeometry args={[R - 0.06, 0.03, 8, 128]} />
      </mesh>
      <mesh position={[rotunda.cx, H + R * 0.42 - 0.15, rotunda.cz]} rotation-x={Math.PI / 2} material={neon(COLORS.cyan, 3)}>
        <torusGeometry args={[1.6, 0.05, 10, 64]} />
      </mesh>
      {[
        [3.0, 3.05, COLORS.cyan],
        [8.9, 8.95, COLORS.violet],
      ].map(([a, b, c]) => (
        <mesh key={c as string} position={[rotunda.cx, 0.006, rotunda.cz]} rotation-x={-Math.PI / 2} material={neon(c as string, 2)}>
          <ringGeometry args={[a as number, b as number, 128]} />
        </mesh>
      ))}

      <Sculpture />
      {layout.rotundaPlanters.map((p, i) => (
        <Plant key={i} position={[p.x, 0, p.z]} scale={1.35} accent={i % 2 ? COLORS.magenta : COLORS.cyan} />
      ))}

      {layout.featured && featuredProject && (
        <>
          <Exhibit
            ex={layout.featured}
            project={featuredProject}
            accent={featuredRoom?.room.accent ?? COLORS.cyan}
            secondary={featuredRoom?.room.secondary ?? COLORS.violet}
            ceilingY={6.4}
            world
            caption="Featured"
          />
          <group position={[rotunda.cx - R + 0.55, 0, rotunda.cz]} rotation-y={Math.PI / 2}>
            <Label font="mono" fontSize={0.12} color="#8b93a8" letterSpacing={0.35} position={[0, 4.55, 0]}>
              FEATURED WORK
            </Label>
            <NeonText color={COLORS.amber} fontSize={0.3} position={[0, 4.15, 0]}>
              {featuredProject.title}
            </NeonText>
          </group>
        </>
      )}
      <Directory layout={layout} />

      {/* Signs over the openings */}
      <group position={[0, 0, rotunda.cz - R + 0.3]}>
        <NeonText color={COLORS.cyan} fontSize={0.42} position={[0, 7.05, 0]} letterSpacing={0.06}>
          THE GRAND GALLERY
        </NeonText>
        <Label font="mono" fontSize={0.14} color="#c9cfe0" letterSpacing={0.25} position={[0, 6.5, 0]}>
          {`${layout.rooms.length} ROOMS  ·  ${works} WORKS`}
        </Label>
      </group>
      <group position={[0, 0, rotunda.cz + R - 0.3]} rotation-y={Math.PI}>
        <Label font="mono" fontSize={0.16} color="#8b93a8" letterSpacing={0.3} position={[0, 5.8, 0]}>
          COURTYARD  ·  EXIT
        </Label>
      </group>
    </group>
  )
}

// ── Grand Gallery ─────────────────────────────────────────────────────────
function Doorway({ layout, index }: { layout: MuseumLayout; index: number }) {
  const r = layout.rooms[index]
  const accent = r.room.accent
  const x = r.side * (gallery.halfW - 0.16)
  const hit = { kind: 'door', room: index }
  const doorMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), [])
  return (
    <group position={[x, 0, r.doorZ]} rotation-y={r.side < 0 ? Math.PI / 2 : -Math.PI / 2}>
      {[-1, 1].map((s) => (
        <NeonBar key={s} size={[0.05, room.doorH, 0.05]} position={[s * (room.doorHalf + 0.03), room.doorH / 2, 0]} color={accent} intensity={3} />
      ))}
      <NeonBar size={[room.doorHalf * 2 + 0.11, 0.05, 0.05]} position={[0, room.doorH + 0.02, 0]} color={accent} intensity={3} />
      <mesh position={[0, room.doorH / 2, 0.02]} material={doorMat} userData={hit}>
        <planeGeometry args={[room.doorHalf * 2, room.doorH]} />
      </mesh>
      <Label font="mono" fontSize={0.1} color="#8b93a8" letterSpacing={0.3} position={[0, 4.85, 0]}>
        {`ROOM ${String(index + 1).padStart(2, '0')}`}
      </Label>
      <NeonText color={accent} fontSize={0.27} position={[0, 4.48, 0]} maxWidth={4.4} textAlign="center">
        {r.room.title}
      </NeonText>
      <Label font="mono" fontSize={0.09} color="#c9cfe0" letterSpacing={0.2} position={[0, 4.12, 0]}>
        {`${r.exhibits.length} ${r.exhibits.length === 1 ? 'WORK' : 'WORKS'}`}
      </Label>
    </group>
  )
}

function GrandGallery({ layout }: { layout: MuseumLayout }) {
  const end = layout.galleryEndZ
  const length = gallery.z0 - end
  const midZ = (gallery.z0 + end) / 2
  const pieces = useMemo(() => {
    const out: { side: -1 | 1; z0: number; z1: number }[] = []
    for (const side of [-1, 1] as const) {
      const gaps = layout.rooms.filter((r) => r.side === side).map((r) => [r.doorZ - room.doorHalf, r.doorZ + room.doorHalf] as [number, number])
      for (const [z0, z1] of wallWithGaps(end, gallery.z0, gaps)) out.push({ side, z0, z1 })
    }
    return out
  }, [layout, end])
  const hasContact = site.contact.email || site.contact.github || site.contact.linkedin

  return (
    <group>
      {pieces.map((p, i) => (
        <Block key={i} size={[0.3, gallery.h, p.z1 - p.z0]} position={[p.side * (gallery.halfW + 0.15), gallery.h / 2, (p.z0 + p.z1) / 2]} material={MAT.wall()} />
      ))}
      {layout.rooms.map((r) => (
        <Block
          key={r.index}
          size={[0.3, gallery.h - room.doorH, room.doorHalf * 2]}
          position={[r.side * (gallery.halfW + 0.15), room.doorH + (gallery.h - room.doorH) / 2, r.doorZ]}
          material={MAT.wall()}
        />
      ))}
      <mesh position={[0, gallery.h, midZ]} rotation-x={Math.PI / 2} material={MAT.ceiling()}>
        <planeGeometry args={[gallery.halfW * 2, length]} />
      </mesh>
      {[-1.3, 1.3].map((x) => (
        <NeonBar key={x} size={[0.08, 0.02, length - 0.4]} position={[x, gallery.h - 0.02, midZ]} color="#cdd6ff" intensity={1.5} />
      ))}
      {[-1, 1].map((s) => (
        <NeonBar key={s} size={[0.02, 0.035, length]} position={[s * (gallery.halfW - 0.01), 0.03, midZ]} color={COLORS.violet} intensity={1.8} />
      ))}
      {layout.rooms.map((r) => (
        <Doorway key={r.room.id} layout={layout} index={r.index} />
      ))}

      {/* End wall */}
      <Block size={[gallery.halfW * 2 + 0.6, gallery.h, 0.3]} position={[0, gallery.h / 2, end - 0.15]} material={MAT.wallLight()} />
      <group position={[0, 0, end + 0.02]}>
        <Label font="mono" fontSize={0.12} color="#8b93a8" letterSpacing={0.35} position={[0, 3.95, 0]}>
          END OF THE GALLERY
        </Label>
        <NeonText color={COLORS.magenta} fontSize={0.48} position={[0, 3.35, 0]}>
          Thank you for visiting
        </NeonText>
        <Label fontSize={0.16} color="#c9cfe0" position={[0, 2.8, 0]}>
          {`${site.name} — ${site.role}`}
        </Label>
        {hasContact && (
          <Label font="mono" fontSize={0.11} color={COLORS.cyan} letterSpacing={0.1} position={[0, 2.4, 0]}>
            {[site.contact.email, site.contact.github, site.contact.linkedin].filter(Boolean).join('   ·   ')}
          </Label>
        )}
        <NeonBar size={[4.6, 0.02, 0.02]} position={[0, 2.05, 0]} color={COLORS.violet} intensity={2} />
      </group>
    </group>
  )
}

export function Interior({ layout }: { layout: MuseumLayout }) {
  const works = layout.rooms.reduce((n, r) => n + r.exhibits.length, 0)
  return (
    <group>
      <EntranceHall works={works} rooms={layout.rooms.length} />
      <Rotunda layout={layout} works={works} />
      <GrandGallery layout={layout} />
    </group>
  )
}

