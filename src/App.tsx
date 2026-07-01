import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { CheckCircle, Circle, LayoutList, Layers, Trash2, ChevronUp, ChevronDown, Plus, Menu, Undo, Redo, History, User, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCaseStore, Task, SubTask, LogEntry } from './store';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TextareaAutosize from 'react-textarea-autosize';

export const scrollState = { constellationProgress: 0 };

// --------------------------------------------------------
// 1. Shaders for Neural Background (Blast removed)
// --------------------------------------------------------
const nebulaVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nebulaFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  
  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float t = uTime * 0.15;
    
    // Organic noise for neural nebula
    float n1 = noise(uv * 2.5 + t);
    float n2 = noise(uv * 5.0 - t * 1.2);
    float n3 = noise(uv * 10.0 + t * 0.8);
    
    float intensity = (n1 + n2 * 0.5 + n3 * 0.25);
    
    // Colors: Deep space to Neural Purple/Blue
    vec3 color1 = vec3(0.01, 0.0, 0.04); // Deep space void
    vec3 color2 = vec3(0.12, 0.0, 0.25); // Deep neural purple
    vec3 color3 = vec3(0.0, 0.25, 0.6);  // Synapse blue
    
    vec3 finalColor = mix(color1, color2, intensity);
    finalColor = mix(finalColor, color3, pow(intensity, 4.0));
    
    // Slow pulsing energy waves instead of aggressive blasts
    float wave = sin(length(uv) * 10.0 - uTime * 1.5) * 0.5 + 0.5;
    finalColor += vec3(0.1, 0.0, 0.3) * wave * pow(intensity, 2.0) * 0.5;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const NebulaBackground = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    if (meshRef.current) {
      meshRef.current.position.z = state.camera.position.z - 100;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -100]}>
      <planeGeometry args={[400, 300]} />
      <shaderMaterial 
        ref={materialRef}
        vertexShader={nebulaVertexShader}
        fragmentShader={nebulaFragmentShader}
        uniforms={{ uTime: { value: 0 } }}
        depthWrite={false}
      />
    </mesh>
  );
};

// --------------------------------------------------------
// 2. Neural Network Nodes
// --------------------------------------------------------
function NeuralNetwork() {
  const { pointsGeo, linesGeo } = React.useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 200; i++) {
       pts.push(new THREE.Vector3(
         (Math.random() - 0.5) * 80,
         (Math.random() - 0.5) * 40,
         (Math.random() - 0.5) * 120 - 20
       ));
    }
    const pointsGeo = new THREE.BufferGeometry().setFromPoints(pts);

    const ls: THREE.Vector3[] = [];
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        if (pts[i].distanceTo(pts[j]) < 10) {
          ls.push(pts[i], pts[j]);
        }
      }
    }
    const linesGeo = new THREE.BufferGeometry().setFromPoints(ls);
    
    return { pointsGeo, linesGeo };
  }, []);

  const ref = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  
  useFrame((state) => {
     if(ref.current) {
        ref.current.rotation.y = scrollState.constellationProgress * 0.0005;
        ref.current.position.y = scrollState.constellationProgress * 0.001;
        ref.current.position.z = state.camera.position.z;
     }
     if(materialRef.current) {
        materialRef.current.opacity = 0.1 + (Math.sin(state.clock.elapsedTime * 1.5) * 0.5 + 0.5) * 0.2;
     }
  });

  return (
    <group ref={ref}>
      <points geometry={pointsGeo}>
        <pointsMaterial color="#38bdf8" size={0.15} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </points>
      <lineSegments geometry={linesGeo}>
        <lineBasicMaterial ref={materialRef} color="#8b5cf6" transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  );
}

// --------------------------------------------------------
// 3. Panel Wrapper (Distance-based Animations & Internal Scroll)
// --------------------------------------------------------
function Panel({ zPosition, rotation, children }: { zPosition: number, rotation: [number, number, number], children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const htmlRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { camera } = useThree();
  const viewMode = useCaseStore(s => s.viewMode);
  
  useFrame(() => {
    if (ref.current && htmlRef.current && containerRef.current) {
      const dist = zPosition - camera.position.z;
      
      let op = 0;
      let blur = 20;
      let pointer = 'none';
      let offsetZ = dist;
      let scale = 1;
      let isLocked = false;

      const approach_start = -45;
      const lock_start = -25;
      const lock_z = -20;
      const pass_start = -10;
      const pass_end = 20;

      if (viewMode === 'project') {
        op = 1;
        blur = 0;
        offsetZ = lock_z; // Changed from -15 to match Task mode lock_start size
        pointer = 'auto';
        isLocked = true;
        scale = 1;
      } else {
        if (dist < approach_start) {
          op = 0;
          blur = 20;
          offsetZ = dist;
        } else if (dist >= approach_start && dist < lock_start) {
          const progress = (dist - approach_start) / (lock_start - approach_start);
          op = progress;
          blur = 20 * (1 - progress);
          // interpolate offsetZ from dist to lock_z
          offsetZ = dist + (lock_z - lock_start) * progress;
          scale = 0.9 + progress * 0.1;
        } else if (dist >= lock_start && dist <= pass_start) {
          op = 1;
          blur = 0;
          offsetZ = lock_z; // Keep it locked exactly at lock_z distance from camera
          pointer = 'auto';
          isLocked = true;
        } else if (dist > pass_start && dist <= pass_end) {
          const progress = (dist - pass_start) / (pass_end - pass_start);
          op = 1 - progress;
          blur = progress * 20;
          offsetZ = lock_z + progress * 30; // Accelerates past camera
          scale = 1 + progress * 0.5; // Expands as it dissipates
        } else {
          op = 0;
          offsetZ = 10;
        }
      }

      ref.current.position.z = camera.position.z + offsetZ;
      
      htmlRef.current.style.opacity = Math.max(0, Math.min(1, op)).toString();
      htmlRef.current.style.transform = `scale(${scale})`;
      htmlRef.current.style.filter = `blur(${Math.max(0, blur)}px)`;
      htmlRef.current.style.pointerEvents = pointer;
      
      if (htmlRef.current.parentElement) {
        htmlRef.current.parentElement.style.pointerEvents = pointer;
        htmlRef.current.parentElement.style.zIndex = isLocked ? '50' : '0';
      }

      if (op <= 0.01) {
        htmlRef.current.style.visibility = 'hidden';
      } else {
        htmlRef.current.style.visibility = 'visible';
      }
    }
  });

  return (
    <group position={[0, 0, zPosition]} rotation={rotation} ref={ref}>
       <Html transform distanceFactor={15} zIndexRange={[100, 0]} center>
         <div ref={htmlRef} style={{ transition: 'none', willChange: 'opacity, transform, filter, visibility' }}>
            <div 
              ref={containerRef} 
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              className={`w-[90vw] max-w-[1000px] h-[85vh] max-h-[900px] relative rounded-3xl bg-transparent`}
            >
               {children}
            </div>
         </div>
       </Html>
    </group>
  );
}

const MovingStars = () => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.z = state.camera.position.z;
      ref.current.rotation.y = scrollState.constellationProgress * 0.0002;
      ref.current.rotation.x = scrollState.constellationProgress * 0.0001;
    }
  });
  return (
    <group ref={ref}>
      <Stars radius={50} depth={50} count={2000} factor={3} saturation={1} fade speed={0} />
    </group>
  );
};

const CameraUpdater = () => {
  const { camera } = useThree();
  const viewMode = useCaseStore((s) => s.viewMode);
  const tasks = useCaseStore((s) => s.tasks);

  useFrame(() => {
    if (viewMode === 'project') {
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 20, 5, 0.016);
    } else {
      const scrollY = window.scrollY;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = scrollY / maxScroll;
      
      const totalDepth = (tasks.length - 1) * 30 + 5; 
      const targetZ = 20 - progress * totalDepth;
      
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 5, 0.016);
    }
  });
  return null;
};

// --------------------------------------------------------
// 4. Scene Controller
// --------------------------------------------------------
const SceneController = () => {
  const viewMode = useCaseStore((s) => s.viewMode);
  const tasks = useCaseStore((s) => s.tasks);

  return (
    <>
      <CameraUpdater />
      <NebulaBackground />
      <NeuralNetwork />
      <MovingStars />
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />

      {viewMode === 'project' ? (
        <Panel zPosition={0} rotation={[0, 0, 0]}>
          <ProjectMasterCard />
        </Panel>
      ) : (
        tasks.map((task, idx) => (
          <Panel key={task.id} zPosition={-idx * 30} rotation={[0, idx % 2 === 0 ? 0.02 : -0.02, 0]}>
            <TaskDetailCard task={task} index={idx} />
          </Panel>
        ))
      )}
    </>
  );
};

// --------------------------------------------------------
// 5. Single Column Cards
// --------------------------------------------------------
function SortableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1 };
  const editMode = useCaseStore(s => s.editMode);
  const editSubMode = useCaseStore(s => s.editSubMode);
  const updateTask = useCaseStore(s => s.updateTask);
  const removeTask = useCaseStore(s => s.removeTask);
  
  const completed = task.subtasks.filter(st => st.completed).length;
  const total = task.subtasks.length;
  const isDone = completed === total && total > 0;

  const isDragMode = editMode && editSubMode === 'drag';
  const isTextMode = editMode && editSubMode === 'text';

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...(isDragMode ? { ...attributes, ...listeners } : {})}
      className={`p-4 sm:p-6 rounded-2xl border transition-colors ${isDone ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'bg-black/40 border-white/10 hover:border-purple-500/30 hover:bg-white/5'} relative ${isDragMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 sm:mb-3 gap-2">
        {isTextMode ? (
           <div className="flex-grow flex items-center justify-between gap-2" onPointerDown={(e) => e.stopPropagation()}>
             <TextareaAutosize 
               value={task.title}
               onChange={(e: any) => updateTask(task.id, { title: e.target.value })}
               className="bg-transparent text-base sm:text-lg font-bold text-white w-full focus:outline-none focus:ring-1 focus:ring-purple-400/50 rounded break-words whitespace-normal resize-none leading-tight p-0 m-0 border-none overflow-hidden"
               minRows={1}
             />
             <button onClick={() => removeTask(task.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors shrink-0"><Trash2 className="w-4 h-4" /></button>
           </div>
        ) : (
           <h3 className={`text-base sm:text-lg font-bold leading-tight break-words whitespace-normal ${isDone ? 'text-purple-300' : 'text-white'}`}>{task.title}</h3>
        )}
        {!isTextMode && (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 mt-1 sm:mt-0">
            <span className="font-mono text-xs sm:text-sm text-gray-400">STATUS:</span>
            <span className={`font-mono text-sm sm:text-base font-bold ${isDone ? 'text-purple-400' : 'text-gray-200'}`}>{completed}/{total}</span>
          </div>
        )}
      </div>
      
      {isTextMode ? (
         <div onPointerDown={(e) => e.stopPropagation()} className="mb-4 sm:mb-6">
           <TextareaAutosize 
             value={task.description}
             onChange={(e: any) => updateTask(task.id, { description: e.target.value })}
             className="bg-transparent text-base text-gray-300 w-full focus:outline-none focus:ring-1 focus:ring-purple-400/50 rounded break-words whitespace-normal resize-none leading-relaxed p-0 m-0 border-none overflow-hidden"
             minRows={1}
           />
         </div>
      ) : (
         <p className="text-gray-400 mb-4 sm:mb-6 text-base leading-relaxed break-words whitespace-normal">{task.description}</p>
      )}

      <div className="w-full bg-black/60 h-2 sm:h-3 rounded-full overflow-hidden border border-white/5">
        <div className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full transition-all duration-700 ease-out" style={{ width: `${total === 0 ? 0 : (completed/total)*100}%` }}></div>
      </div>
    </div>
  )
}

function ProjectMasterCard() {
  const { tasks, reorderTasks, editMode, addTask } = useCaseStore();
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      reorderTasks(oldIndex, newIndex);
    }
  };

  return (
    <div 
      className="bg-black/70 backdrop-blur-3xl border border-purple-500/30 rounded-3xl p-6 sm:p-12 shadow-[0_0_80px_rgba(139,92,246,0.15)] text-[#E2E8F0] h-full flex flex-col relative overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/30"
    >
      <div className="flex flex-col gap-2 mb-8 sm:mb-12 border-b border-purple-500/20 pb-6 relative z-20">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Project Architecture</h1>
        <p className="text-purple-400 font-mono tracking-widest text-xs sm:text-sm uppercase">Master Sequence Checklist</p>
      </div>
      
      <div className="flex flex-col gap-6 relative z-10 pb-12">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map(task => (
               <SortableTask key={task.id} task={task} />
            ))}
          </SortableContext>
        </DndContext>
        
        {editMode && (
          <button 
            onClick={addTask}
            className="flex items-center justify-center gap-2 bg-black/40 border border-white/10 hover:border-purple-500/50 hover:bg-white/5 p-6 sm:p-8 rounded-2xl text-purple-400 transition-colors mt-2"
          >
            <Plus className="w-6 h-6" /> <span className="text-lg font-medium tracking-widest uppercase font-mono">Add Task</span>
          </button>
        )}
      </div>
    </div>
  )
}

function SortableSubtask({ st, task, editMode, toggleSubTask, updateSubTask, removeSubTask }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: st.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1 };
  const editSubMode = useCaseStore(s => s.editSubMode);

  const isDragMode = editMode && editSubMode === 'drag';
  const isTextMode = editMode && editSubMode === 'text';

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...(isDragMode ? { ...attributes, ...listeners } : {})}
      onClick={() => editMode && toggleSubTask(task.id, st.id)}
      className={`flex items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl border transition-colors duration-300 relative ${st.completed ? 'bg-cyan-500/15 border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.1)]' : 'bg-black/40 border-white/10 hover:border-cyan-400/50 hover:bg-white/5'} ${editMode ? 'cursor-pointer' : ''} ${isDragMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {isTextMode ? (
         <div className="flex-grow flex items-center justify-between gap-2" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
           <TextareaAutosize 
             value={st.title}
             onChange={(e: any) => updateSubTask(task.id, st.id, e.target.value)}
             className={`bg-transparent text-base font-medium text-white w-full focus:outline-none focus:ring-1 focus:ring-cyan-400/50 rounded break-words whitespace-normal resize-none leading-snug p-0 m-0 border-none overflow-hidden ${st.completed ? 'text-cyan-300 line-through opacity-80' : ''}`}
             minRows={1}
           />
           <button onClick={() => removeSubTask(task.id, st.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors shrink-0"><Trash2 className="w-4 h-4" /></button>
         </div>
      ) : (
         <span className={`text-base font-medium leading-snug transition-colors break-words whitespace-normal w-full ${st.completed ? 'text-cyan-300 line-through opacity-80' : 'text-gray-300'}`}>{st.title}</span>
      )}
    </div>
  )
}

function TaskDetailCard({ task, index }: { task: Task, index: number }) {
  const { toggleSubTask, editMode, updateTask, updateSubTask, removeSubTask, addSubTask, reorderSubTasks, editSubMode } = useCaseStore();
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isTextMode = editMode && editSubMode === 'text';

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = task.subtasks.findIndex((st) => st.id === active.id);
      const newIndex = task.subtasks.findIndex((st) => st.id === over.id);
      reorderSubTasks(task.id, oldIndex, newIndex);
    }
  };
  
  return (
    <div 
      className="bg-black/70 backdrop-blur-3xl border border-cyan-500/30 rounded-3xl p-6 sm:p-12 shadow-[0_0_80px_rgba(6,182,212,0.15)] text-[#E2E8F0] h-full flex flex-col relative overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/30"
    >
      <div className="flex items-start sm:items-center gap-4 sm:gap-6 mb-6 relative z-10">
         <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center font-mono text-cyan-300 text-xl sm:text-2xl font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0 mt-1 sm:mt-0">
            {index + 1}
         </div>
         {isTextMode ? (
            <div className="flex-grow" onPointerDown={(e) => e.stopPropagation()}>
              <TextareaAutosize 
                value={task.title}
                onChange={(e: any) => updateTask(task.id, { title: e.target.value })}
                className="bg-transparent text-xl sm:text-2xl font-extrabold text-white leading-tight w-full focus:outline-none focus:ring-1 focus:ring-cyan-500/50 rounded break-words whitespace-normal resize-none p-0 m-0 border-none overflow-hidden"
                minRows={1}
              />
            </div>
         ) : (
            <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight break-words whitespace-normal">{task.title}</h2>
         )}
      </div>
      
      <div className="relative z-10">
        {isTextMode ? (
          <div onPointerDown={(e) => e.stopPropagation()}>
            <TextareaAutosize 
              value={task.description}
              onChange={(e: any) => updateTask(task.id, { description: e.target.value })}
              className="bg-transparent text-base text-gray-300 w-full mb-8 sm:mb-12 leading-relaxed border-b border-cyan-500/20 pb-8 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 rounded break-words whitespace-normal resize-none p-0 m-0 overflow-hidden"
              minRows={1}
            />
          </div>
        ) : (
          <p className="text-gray-400 text-sm sm:text-base mb-8 sm:mb-12 leading-relaxed border-b border-cyan-500/20 pb-8 break-words whitespace-normal">{task.description}</p>
        )}
      </div>
      
      <div className="flex flex-col gap-4 sm:gap-5 pb-12 relative z-10">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={task.subtasks.map(st => st.id)} strategy={verticalListSortingStrategy}>
            {task.subtasks.map(st => (
               <SortableSubtask 
                 key={st.id} 
                 st={st} 
                 task={task} 
                 editMode={editMode} 
                 toggleSubTask={toggleSubTask} 
                 updateSubTask={updateSubTask} 
                 removeSubTask={removeSubTask} 
               />
            ))}
          </SortableContext>
        </DndContext>
        
        {editMode && (
          <button 
            onClick={() => addSubTask(task.id)}
            className="flex items-center justify-center gap-2 bg-black/40 border border-white/10 hover:border-cyan-400/50 hover:bg-white/5 p-5 sm:p-6 rounded-2xl text-cyan-400 transition-colors mt-2"
          >
            <Plus className="w-6 h-6" /> <span className="text-lg font-medium">Add Subtask</span>
          </button>
        )}
      </div>
    </div>
  )
}

// --------------------------------------------------------
// 6. Application Root & HUD
// --------------------------------------------------------
export default function App() {
  const { viewMode, setViewMode, editSubMode, setEditSubMode, developerMode, setDeveloperMode, undo, redo, pastStates, futureStates, changeLog, revertToLog } = useCaseStore();
  const editMode = useCaseStore(s => s.editMode);
  
  const [containerHeight, setContainerHeight] = useState('400vh');
  const [showChangeLog, setShowChangeLog] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Format date helper
  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('en-US', { 
      month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit', second: '2-digit', 
      hour12: true 
    });
  };

  // Filter logs for Developer Mode vs User Mode
  const visibleLogs = changeLog.filter(log => developerMode ? true : log.type === 'user');
  
  // Log AI modifications on load if version bumped
  useEffect(() => {
    const CURRENT_APP_VERSION = 'v1.1.0';
    const store = useCaseStore.getState();
    if (store.appVersion !== CURRENT_APP_VERSION) {
      store.setAppVersion(CURRENT_APP_VERSION);
      // Wait for the state to settle, then log
      setTimeout(() => {
        useCaseStore.getState().commitChange('AI Studio Modifications Applied: Alignment and UI tweaks', 'dev');
      }, 0);
    }
  }, []);

  // Update scroll container height based on mode so we have proportional scroll depth
  useEffect(() => {
    // Project mode uses 100vh so it doesn't trigger global scrolling on Z-axis.
    // Task mode uses 800vh to provide a long scroll track for scrubbing the cards on Z-axis.
    setContainerHeight(viewMode === 'project' ? '100vh' : '800vh');
  }, [viewMode]);

  return (
    <div className="w-full bg-black text-white font-sans cursor-default" style={{ height: containerHeight }}>
      
      {/* Persistent HUD & Navigation */}
      <div className="fixed top-0 left-0 right-0 p-4 sm:p-6 z-50 flex justify-between items-center gap-2 sm:gap-4 pointer-events-none">
        
        {/* Top Left: Mode Toggle (approx 1/4 width) */}
        <div className="pointer-events-auto flex-1 flex justify-start">
           <button 
             onClick={() => setViewMode(viewMode === 'project' ? 'task' : 'project')}
             className="w-full max-w-[200px] h-[48px] bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 px-2 sm:px-4 rounded-xl font-mono text-[9px] sm:text-[10px] tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] backdrop-blur-md flex items-center justify-center text-center leading-tight"
           >
             {viewMode === 'project' ? 'Switch to Task Management' : 'Switch to Project Management'}
           </button>
        </div>

        {/* Center: Title & Subtitle (approx 1/2 width) */}
        <div className="flex-[2] flex flex-col items-center justify-center h-[48px] pointer-events-auto">
           <div className="flex flex-col w-max items-center">
             <div className="font-extrabold text-white tracking-[0.2em] text-2xl sm:text-3xl leading-none drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] text-center">
               TASKassist
             </div>
             <div className="text-xs sm:text-sm text-cyan-400 font-mono leading-none opacity-80 mt-2 flex justify-between w-full">
               {'Datacartel Collective'.split('').map((char, i) => (
                 <span key={i}>{char === ' ' ? '\u00A0' : char}</span>
               ))}
             </div>
           </div>
        </div>

        {/* Top Right: Edit Button (approx 1/4 width) */}
        <div className="pointer-events-auto flex-1 flex justify-end items-center">
           {!editMode ? (
             <button 
               onClick={() => useCaseStore.getState().setEditMode(true)}
               className="w-full max-w-[200px] h-[48px] px-2 sm:px-4 rounded-xl font-mono text-[10px] sm:text-xs tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] backdrop-blur-md flex items-center justify-center text-center leading-tight bg-white/10 text-white border border-white/20 hover:bg-white/20"
             >
               Edit
             </button>
           ) : (
             <div className="w-full max-w-[200px] h-[48px] flex flex-col gap-1">
               <button 
                 onClick={() => useCaseStore.getState().setEditMode(false)}
                 className="flex-1 w-full px-2 rounded-t-lg rounded-b-sm font-mono text-[9px] tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(6,182,212,0.3)] backdrop-blur-md flex items-center justify-center text-center leading-tight bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30"
               >
                 Save & Exit
               </button>
               <button
                 onClick={() => setDeveloperMode(!developerMode)}
                 className={`flex-1 w-full px-2 rounded-b-lg rounded-t-sm font-mono text-[8px] tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(234,179,8,0.2)] backdrop-blur-md flex items-center justify-center text-center border leading-tight ${developerMode ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 hover:bg-yellow-500/30' : 'bg-black/60 text-gray-400 border-white/20 hover:bg-white/10'}`}
               >
                 <Code className="w-3 h-3 mr-1" />
                 {developerMode ? 'Dev Mode: ON' : 'Dev Mode: OFF'}
               </button>
             </div>
           )}
        </div>
      </div>

      {(viewMode === 'task' || editMode) && (
        <div className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-stretch gap-1 sm:gap-2 w-full max-w-[90vw] sm:max-w-[700px] lg:max-w-[800px]">
          
          {editMode && (
            <div className="flex gap-2 sm:gap-4 pointer-events-auto w-full px-2 sm:px-4 justify-center">
              <button 
                onClick={() => setEditSubMode('text')}
                className={`flex-1 px-2 py-1.5 sm:py-2 max-w-[200px] rounded-xl font-mono text-[8px] sm:text-[9px] tracking-widest uppercase transition-all backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.3)] border text-center flex items-center justify-center ${editSubMode === 'text' ? 'bg-cyan-500/30 text-cyan-200 border-cyan-500/50 font-bold' : 'bg-black/60 text-gray-400 border-white/20 hover:bg-white/10'}`}
              >
                Modify Text
              </button>
              <button 
                onClick={() => setShowChangeLog(true)}
                className={`flex-1 px-2 py-1.5 sm:py-2 max-w-[200px] rounded-xl font-mono text-[8px] sm:text-[9px] tracking-widest uppercase transition-all backdrop-blur-md shadow-[0_0_15px_rgba(234,179,8,0.3)] border text-center flex items-center justify-center bg-black/60 text-yellow-400/80 border-white/20 hover:bg-yellow-500/20`}
              >
                Change Log
              </button>
              <button 
                onClick={() => setEditSubMode('drag')}
                className={`flex-1 px-2 py-1.5 sm:py-2 max-w-[200px] rounded-xl font-mono text-[8px] sm:text-[9px] tracking-widest uppercase transition-all backdrop-blur-md shadow-[0_0_15px_rgba(168,85,247,0.3)] border text-center flex items-center justify-center ${editSubMode === 'drag' ? 'bg-purple-500/30 text-purple-200 border-purple-500/50 font-bold' : 'bg-black/60 text-gray-400 border-white/20 hover:bg-white/10'}`}
              >
                {viewMode === 'project' ? 'Modify Task Order' : 'Modify Sub-Task Order'}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-4 pointer-events-auto justify-center w-full px-2 sm:px-4">
            {editMode && (
              <button 
                onClick={undo}
                disabled={pastStates.length === 0}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-black/60 border border-white/20 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-md text-white/90 shrink-0"
              >
                <Undo className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            )}

            <div className="flex-grow max-w-[500px] text-[8px] sm:text-[9px] text-white/90 font-mono uppercase tracking-[0.1em] border border-white/20 bg-black/60 px-3 sm:px-5 py-1.5 sm:py-2 rounded-2xl sm:rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.1)] flex flex-col items-center justify-center gap-1 min-w-max">
              <div className="flex items-center gap-2">
                <span>
                  {!editMode 
                    ? 'SCROLL TO BROWSE TASKS' 
                    : (editSubMode === 'drag' 
                        ? (viewMode === 'project' ? 'DRAG TO RE-ORDER TASKS' : 'DRAG TO RE-ORDER SUB TASKS') 
                        : 'EDITING TEXT FIELDS')}
                </span>
                {!editMode && <motion.span animate={{ y: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>↓</motion.span>}
              </div>
              {!editMode && (
                <span className="text-[6.5px] sm:text-[7.5px] text-cyan-300/90 tracking-[0.15em] text-center whitespace-nowrap font-semibold">
                  ENTER EDIT MODE TO MARK TASKS COMPLETE OR INCOMPLETE
                </span>
              )}
            </div>

            {editMode && (
              <button 
                onClick={redo}
                disabled={futureStates.length === 0}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-black/60 border border-white/20 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-md text-white/90 shrink-0"
              >
                <Redo className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3D Canvas Background */}
      <div className="fixed inset-0 z-0 bg-black">
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }} gl={{ antialias: true, alpha: false }} style={{ touchAction: 'auto' }}>
          <SceneController />
        </Canvas>
      </div>

      {/* Change Log Overlay */}
      <AnimatePresence>
        {showChangeLog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto"
          >
            {/* Blurred Backdrop */}
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-xl"
              onClick={() => setShowChangeLog(false)}
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              className="relative w-full max-w-4xl h-[85vh] sm:h-[80vh] flex flex-col bg-black/60 border border-white/20 rounded-3xl shadow-[0_0_80px_rgba(255,255,255,0.1)] overflow-hidden m-4 sm:m-8"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 shrink-0">
                <button
                  onClick={() => setDeveloperMode(!developerMode)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-[10px] tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(234,179,8,0.2)] border leading-tight ${developerMode ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' : 'bg-black/60 text-gray-400 border-white/20 hover:bg-white/10'}`}
                >
                  <Code className="w-3 h-3 inline mr-2" />
                  Dev Mode
                </button>
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-lg sm:text-xl font-bold tracking-[0.2em] uppercase text-white font-mono">
                    Change Log {developerMode && <span className="text-yellow-400 opacity-80">(Developer)</span>}
                  </h2>
                </div>
                <button
                  onClick={() => setShowChangeLog(false)}
                  className="px-4 py-2 rounded-xl font-mono text-[10px] tracking-widest uppercase transition-all bg-white/10 text-white border border-white/20 hover:bg-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                >
                  Save & Exit
                </button>
              </div>

              {/* Log List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-white/20 space-y-4">
                {visibleLogs.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500 font-mono tracking-widest uppercase text-xs">
                    No changes recorded yet.
                  </div>
                ) : (
                  visibleLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <div 
                        key={log.id} 
                        className={`border rounded-xl transition-all cursor-pointer overflow-hidden ${log.type === 'dev' ? 'border-yellow-500/30 bg-yellow-950/20' : 'border-white/10 bg-black/40'} ${isExpanded ? 'shadow-[0_0_30px_rgba(255,255,255,0.05)] ring-1 ring-white/20' : 'hover:bg-white/5'}`}
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {log.type === 'dev' ? <Code className="w-4 h-4 text-yellow-400" /> : <User className="w-4 h-4 text-cyan-400" />}
                            <span className="font-mono text-xs sm:text-sm text-white/90 uppercase tracking-wider">{log.description}</span>
                          </div>
                          <span className="font-mono text-[10px] text-gray-500 text-right">{formatDate(log.timestamp)}</span>
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-4 pb-4 border-t border-white/5"
                            >
                              <div className="pt-4 flex flex-col gap-4">
                                <div className="text-xs text-gray-400 font-mono">
                                  Snapshot contains {log.tasksSnapshot.length} root tasks.
                                  <br/>
                                  Type: {log.type === 'dev' ? 'Developer Modification' : 'User Modification'}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    revertToLog(log);
                                    setShowChangeLog(false);
                                  }}
                                  className="self-start px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-lg font-mono text-[10px] tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                >
                                  Revert to this state
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
