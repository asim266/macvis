import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Billboard, Line, Stars, Float } from '@react-three/drei'
import * as THREE from 'three'

interface Agent {
  id: string; role: string; name: string; icon: string; color: string
  status: string; currentTask?: string; lastMessage?: string
}

const ACTIVE = new Set(['thinking', 'working', 'reviewing'])

function AgentNode({ agent, position, isCenter }: { agent: Agent; position: [number, number, number]; isCenter: boolean }) {
  const mesh = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const active = ACTIVE.has(agent.status)
  const errored = agent.status === 'error'
  const done = agent.status === 'done'
  const color = errored ? '#ef4444' : agent.color

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (mesh.current) {
      const base = isCenter ? 0.85 : 0.62
      const pulse = active ? 1 + Math.sin(t * 4) * 0.09 : 1
      mesh.current.scale.setScalar(base * pulse)
      const mat = mesh.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = active ? 0.9 + Math.sin(t * 4) * 0.4 : done ? 0.55 : 0.25
    }
    if (halo.current) {
      const s = active ? 1.5 + Math.sin(t * 3) * 0.25 : 1.35
      halo.current.scale.setScalar((isCenter ? 1.05 : 0.78) * s)
      const m = halo.current.material as THREE.MeshBasicMaterial
      m.opacity = active ? 0.18 + Math.sin(t * 3) * 0.06 : 0.08
    }
  })

  return (
    <Float speed={active ? 2.5 : 1.2} rotationIntensity={0.15} floatIntensity={isCenter ? 0.3 : 0.6}>
      <group position={position}>
        {/* glow halo */}
        <mesh ref={halo}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} />
        </mesh>
        {/* core orb */}
        <mesh ref={mesh}>
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.35} metalness={0.4} />
        </mesh>
        {/* label */}
        <Billboard position={[0, isCenter ? 1.5 : 1.15, 0]}>
          <Text fontSize={isCenter ? 0.34 : 0.28} color="#fff" anchorX="center" anchorY="middle" outlineWidth={0.012} outlineColor="#000">
            {agent.icon}  {agent.name}
          </Text>
          <Text position={[0, isCenter ? -0.34 : -0.3, 0]} fontSize={0.17} color={active ? color : '#9aa0aa'} anchorX="center" anchorY="middle" maxWidth={4.2} outlineWidth={0.008} outlineColor="#000">
            {errored ? 'error' : (agent.currentTask || agent.status)}
          </Text>
        </Billboard>
      </group>
    </Float>
  )
}

function CommLink({ from, to, active }: { from: [number, number, number]; to: [number, number, number]; active: boolean }) {
  const ref = useRef<any>(null)
  useFrame((state) => {
    if (ref.current) {
      const o = active ? 0.35 + Math.sin(state.clock.elapsedTime * 5) * 0.25 : 0.12
      ref.current.material.opacity = o
    }
  })
  return <Line ref={ref} points={[from, to]} color={active ? '#7dd3fc' : '#475569'} lineWidth={active ? 2 : 1} transparent opacity={0.2} />
}

function Scene({ agents }: { agents: Agent[] }) {
  const center = agents[0]
  const workers = agents.slice(1)
  const positions = useMemo(() => {
    const r = Math.max(3, workers.length * 0.7)
    return workers.map((_, i) => {
      const a = (i / Math.max(1, workers.length)) * Math.PI * 2
      return [Math.cos(a) * r, Math.sin(a * 1.3) * 0.6, Math.sin(a) * r] as [number, number, number]
    })
  }, [workers.length])
  const centerPos: [number, number, number] = [0, 0, 0]

  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 6, 6]} intensity={120} />
      <pointLight position={[-8, -4, -6]} intensity={40} color="#3b82f6" />
      <Stars radius={60} depth={40} count={1800} factor={3} saturation={0} fade speed={0.6} />

      {center && <AgentNode agent={center} position={centerPos} isCenter />}
      {workers.map((w, i) => (
        <group key={w.id}>
          <CommLink from={centerPos} to={positions[i]} active={ACTIVE.has(w.status)} />
          <AgentNode agent={w} position={positions[i]} isCenter={false} />
        </group>
      ))}

      <OrbitControls enablePan={false} enableZoom autoRotate autoRotateSpeed={0.6} minDistance={5} maxDistance={20} />
    </>
  )
}

export function TeamScene3D({ agents }: { agents: Agent[] }) {
  return (
    <Canvas camera={{ position: [0, 3, 11], fov: 50 }} style={{ width: '100%', height: '100%' }} dpr={[1, 2]}>
      <color attach="background" args={['#0a0c10']} />
      <fog attach="fog" args={['#0a0c10', 14, 32]} />
      <Scene agents={agents} />
    </Canvas>
  )
}
