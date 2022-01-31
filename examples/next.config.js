const path = require('path');
const withTM = require('next-transpile-modules')([
  'three',
  '@react-three/xr',
  '@webxr-input-profiles/motion-controllers',
]); // pass the modules you would like to see transpiled

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { esmExternals: 'loose' }, // Workaround for https://github.com/pmndrs/react-xr/issues/101
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          }
        ]
      }
    ]
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
      '@react-three/fiber': path.resolve('./node_modules/@react-three/fiber'),
      'three': path.resolve('./node_modules/three'),
    }
    return config;
  },
}

module.exports = withTM(nextConfig);





// module.exports = nextConfig;

// your aliases
// 'use-ammojs': 'next/dist/next-server/lib/head.js',
//require.resolve('three'),
// 'use-ammojs': require.resolve('../'),
// 'three/examples/jsm/loaders/GLTFLoader.js': require.resolve('three-stdlib'),
// 'three/examples/jsm/loaders/GLTFLoader': require.resolve('three-stdlib'),
// 'three/examples': require.resolve('three-stdlib'),
// './node_modules/three/examples/jsm/loaders/GLTFLoader.js': require.resolve('three-stdlib'),
// [require.resolve('three/examples/jsm/loaders/GLTFLoader.js')]: require.resolve('three-stdlib'),
// console.log('config.resolve.alias', config.resolve.alias)
