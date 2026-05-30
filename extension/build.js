const esbuild = require('esbuild');
const path = require('path');

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');

// Environment configuration
const envConfig = production
  ? {
      WEB_APP_URL: 'https://sphynx.app',
      API_URL: 'https://api.sphynx.app/api',
    }
  : {
      WEB_APP_URL: 'http://localhost:3000',
      API_URL: 'http://localhost:5000/api',
    };

const buildOptions = {
  entryPoints: {
    background: 'src/background/index.ts',
    content: 'src/content/index.ts',
    popup: 'src/popup/index.tsx'
  },
  bundle: true,
  outdir: 'public/dist',
  sourcemap: !production,
  minify: production,
  target: ['chrome100', 'es2022'],
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': production ? '"production"' : '"development"',
    '__WEB_APP_URL__': JSON.stringify(envConfig.WEB_APP_URL),
    '__API_URL__': JSON.stringify(envConfig.API_URL),
  }
};

async function run() {
  if (watch) {
    console.log('Starting esbuild watch mode (development)...');
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
  } else {
    const env = production ? 'production' : 'development';
    console.log(`Running esbuild ${env} build...`);
    console.log(`  WEB_APP_URL: ${envConfig.WEB_APP_URL}`);
    console.log(`  API_URL: ${envConfig.API_URL}`);
    await esbuild.build(buildOptions);
    console.log('Build completed successfully!');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
