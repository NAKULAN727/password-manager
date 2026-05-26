const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: {
    background: 'src/background/index.ts',
    content: 'src/content/index.ts',
    popup: 'src/popup/index.tsx'
  },
  bundle: true,
  outdir: 'public/dist',
  sourcemap: true,
  minify: !watch,
  target: ['chrome100', 'es2022'],
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': watch ? '"development"' : '"production"'
  }
};

async function run() {
  if (watch) {
    console.log('Starting esbuild watch mode...');
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
  } else {
    console.log('Running esbuild production build...');
    await esbuild.build(buildOptions);
    console.log('Build completed successfully!');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
