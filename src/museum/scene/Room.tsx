'use client'
import { DIMS, type RoomLayout } from '../layout/layoutMuseum'
import { useMuseum, useScene } from '../store'
import { roomColors } from '../theme'
import { Exhibit } from './Exhibit'
import { mats, neon, standard } from './materials'
import { Bench, Block, Label, NeonBar, NeonText, Plant, Stanchions } from './primitives'

const { halfWidth: HW, depth: D, h: H } = DIMS.room

/** One generated gallery room, built in room-local space (+z = into the room, +x = visitor's left). */
export function Room({ layout }: { layout: RoomLayout }) {
  const projects = useMuseum((s) => s.projects)
  const t = useScene()
  const m = mats(t)
  const day = t.name === 'day'
  const { room } = layout
  const c = roomColors(room, t.name)
  const hasHero = layout.exhibits.some((e) => e.hero)
  const label = `ROOM ${String(room.index + 1).padStart(2, '0')}`
  // By day the back wall is painted in the room colour (lettering in white); at night it's dark with neon type.
  const backWall = day ? standard(c.feature, 0.95) : m.wallAlt
  const titleInk = day ? '#ffffff' : c.accent
  const subInk = day ? '#f7f5f1' : '#a6aec2'
  const smallInk = day ? '#efebe4' : '#8b93a8'

  return (
    <group position={layout.position} rotation-y={layout.rotationY}>
      {/* Shell */}
      <Block size={[0.3, H, D]} position={[HW + 0.15, H / 2, D / 2]} material={m.wall} />
      <Block size={[0.3, H, D]} position={[-HW - 0.15, H / 2, D / 2]} material={m.wall} />
      <Block size={[2 * HW + 0.6, H, 0.3]} position={[0, H / 2, D + 0.15]} material={backWall} />
      <mesh position={[0, H, D / 2]} rotation-x={Math.PI / 2} material={m.ceiling}>
        <planeGeometry args={[2 * HW, D]} />
      </mesh>

      {/* Skirting (shadow gap by day, neon at night) */}
      <NeonBar size={[0.02, 0.035, D]} position={[HW - 0.01, 0.03, D / 2]} color={c.accent} intensity={day ? undefined : 2.2} />
      <NeonBar size={[0.02, 0.035, D]} position={[-HW + 0.01, 0.03, D / 2]} color={c.accent} intensity={day ? undefined : 2.2} />
      <NeonBar size={[2 * HW, 0.035, 0.02]} position={[0, 0.03, D - 0.01]} color={c.accent} intensity={day ? undefined : 2.2} />

      {/* Ceiling light: long skylights by day, neon coves at night */}
      {day ? (
        [-2.2, 0, 2.2].map((x) => (
          <group key={x}>
            <NeonBar kind="light" size={[0.9, 0.02, D - 2.4]} position={[x, H - 0.022, D / 2]} color="#ffffff" />
            {/* Recessed reveal around the skylight */}
            <Block size={[1.04, 0.012, D - 2.26]} position={[x, H - 0.006, D / 2]} material={m.wallAlt} />
          </group>
        ))
      ) : (
        <>
          <NeonBar kind="light" size={[0.04, 0.02, D]} position={[HW - 0.25, H - 0.02, D / 2]} color={c.secondary} />
          <NeonBar kind="light" size={[0.04, 0.02, D]} position={[-HW + 0.25, H - 0.02, D / 2]} color={c.secondary} />
        </>
      )}

      {/* Track rails the spotlights hang from */}
      {[-2.9, 2.9].map((x) => (
        <Block key={x} size={[0.06, 0.05, D - 1]} position={[x, H - 0.08, D / 2]} material={m.frame} />
      ))}
      <Block size={[2 * HW - 1, 0.05, 0.06]} position={[0, H - 0.08, D - 1.6]} material={m.frame} />

      {/* Back-wall title */}
      {hasHero ? (
        <group position={[0, 0, D - 0.02]} rotation-y={Math.PI}>
          <Label font="mono" fontSize={0.12} color={smallInk} letterSpacing={0.3} position={[0, 4.62, 0]}>
            {label}
          </Label>
          <NeonText color={titleInk} fontSize={0.34} position={[0, 4.3, 0]} letterSpacing={0.02}>
            {room.title}
          </NeonText>
          <Label fontSize={0.12} color={subInk} position={[0, 3.95, 0]} maxWidth={6} textAlign="center">
            {room.subtitle}
          </Label>
        </group>
      ) : (
        <group position={[0, 0, D - 0.02]} rotation-y={Math.PI}>
          <Label font="mono" fontSize={0.16} color={smallInk} letterSpacing={0.3} position={[0, 3.35, 0]}>
            {label}
          </Label>
          <NeonText color={titleInk} fontSize={0.62} position={[0, 2.7, 0]} maxWidth={8} textAlign="center">
            {room.title}
          </NeonText>
          <Label fontSize={0.17} color={subInk} position={[0, 2.0, 0]} maxWidth={7} textAlign="center">
            {room.subtitle}
          </Label>
          <mesh position={[0, 1.7, 0]} material={day ? neon('#ffffff', 1) : neon(c.secondary, 2)}>
            <boxGeometry args={[3, 0.02, 0.01]} />
          </mesh>
        </group>
      )}

      {/* Exhibits */}
      {layout.exhibits.map((ex) => {
        const project = projects[ex.slug]
        if (!project) return null
        return <Exhibit key={ex.id} ex={ex} project={project} accent={c.accent} secondary={c.secondary} ceilingY={H} caption={room.title} />
      })}

      {/* Furniture */}
      {layout.benches.map((b, i) => (
        <Bench key={i} position={[b.lx, 0, b.lz]} />
      ))}
      {layout.plants.map((p, i) => (
        <Plant key={i} position={[p.lx, 0, p.lz]} accent={i < 2 ? c.secondary : c.accent} scale={i < 2 ? 1.15 : 0.9} />
      ))}
      {layout.stanchions && <Stanchions position={[0, 0, 10.5]} accent={day ? c.accent : c.accent} />}

      {/* Doorway threshold strip */}
      <mesh position={[0, 0.004, 0.2]} rotation-x={-Math.PI / 2} material={day ? m.frame : neon(c.accent, 1.4)}>
        <planeGeometry args={[2 * DIMS.room.doorHalf, 0.04]} />
      </mesh>
    </group>
  )
}
