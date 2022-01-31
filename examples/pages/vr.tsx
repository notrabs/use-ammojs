import React, { useEffect, Suspense, useCallback } from 'react'
import { OrbitControls, Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber';
import { VRCanvas } from '@react-three/xr';
import { Physics, PhysicsStats } from 'use-ammojs'

import { Scene } from '../components/VrDemo'
import Head from 'next/head';

const isVr = true; // For development purposes
const MainCanvas = isVr ? VRCanvas : Canvas;

function App() {
    return (<>
        <Head>
            <title>VR Demo: Use-Ammo.js</title>
        </Head>
        <MainCanvas shadowMap>
            <Suspense fallback={null}>
                <Physics
                    // drawDebug
                    // drawDebugMode={{
                    //     DrawWireframe: true,
                    // }}
                >
                    <Scene isVr={isVr} />
                    <OrbitControls />
                    <ambientLight intensity={0.5} />
                    <spotLight position={[1, 8, 1]} angle={0.3} penumbra={1} intensity={1} castShadow />
                    <Stats />
                    <PhysicsStats top={48} />
                </Physics>
            </Suspense>
        </MainCanvas>
    </>);
}

export default App;
