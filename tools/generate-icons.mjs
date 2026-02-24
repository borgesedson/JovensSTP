#!/usr/bin/env node
// Generate PWA icons from a source image using pwa-asset-generator
// Usage: node tools/generate-icons.mjs public/icon-source.png
import { existsSync } from 'node:fs'
import { mkdir, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const candidateInputs = [
  process.argv[2],
  'public/icon-source.png',
  'public/icon-source.svg',
  'public/logo.svg',
].filter(Boolean)
const src = candidateInputs.find((p) => existsSync(p))
const outDir = 'public/generated-icons'

async function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts })
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))))
  })
}

async function main() {
  if (!src) {
    console.error(`\n[icons] Fonte não encontrada.`)
    console.error('[icons] Coloque a tua arte em public/icon-source.png ou public/icon-source.svg (1024x1024 recomendado)')
    console.error('        ou passe um caminho:  npm run icons -- public/minha-arte.png')
    process.exit(1)
  }

  await mkdir(outDir, { recursive: true })

  // Gera ícones, maskable e apple-touch; mantém caminho raiz nos hrefs
  await run('npx', [
    'pwa-asset-generator',
    src,
    outDir,
    '--type', 'png',
    '--background', '#16a34a',
    '--padding', '12%',
    '--icon-only',
    '--favicon', 'true',
    '--maskable', 'true',
    '--apple', 'true',
    '--path-override', '/',
  ])

  // Copia os arquivos principais para os nomes usados no projeto
  // pwa-asset-generator pode criar nomes diferentes consoante flags.
  // Preferimos os ficheiros 'manifest-icon-*' quando existirem.
  const candidates192 = [
    path.join(outDir, 'manifest-icon-192.maskable.png'),
    path.join(outDir, 'android-chrome-192x192.png'),
  ]
  const candidates512 = [
    path.join(outDir, 'manifest-icon-512.maskable.png'),
    path.join(outDir, 'android-chrome-512x512.png'),
  ]
  const android192 = candidates192.find((p) => existsSync(p))
  const android512 = candidates512.find((p) => existsSync(p))
  const apple180   = path.join(outDir, 'apple-touch-icon.png')

  try {
    if (android192) await copyFile(android192, 'public/manifest-icon-192.maskable.png')
    if (android512) await copyFile(android512, 'public/manifest-icon-512.maskable.png')
  } catch (e) {
    console.warn('[icons] Aviso ao copiar ícones Android:', e?.message)
  }
  try {
    if (existsSync(apple180)) {
      await copyFile(apple180, 'public/apple-icon-180.png')
    }
  } catch (e) {
    console.warn('[icons] Aviso ao copiar ícone Apple:', e?.message)
  }

  console.log('\n[icons] Ícones gerados e copiados!')
  console.log('- Substituídos: public/manifest-icon-192.maskable.png, public/manifest-icon-512.maskable.png')
  console.log('- Apple touch:  public/apple-icon-180.png')
  console.log('\nDica: volta a buildar e publicar:')
  console.log('   npm run build && firebase deploy --only hosting')
}

main().catch((e) => {
  console.error('[icons] Falhou:', e)
  process.exit(1)
})
