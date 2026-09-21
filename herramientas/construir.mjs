/* --------------------------------------------------------------------------
   Arma dist/demo.html: todo el proyecto en un único archivo HTML, con el CSS,
   los módulos y los datos incrustados.

   Para qué sirve: mandarle el prototipo a alguien por mail o por WhatsApp para
   que lo abra con doble clic, sin servidor y sin repositorio. No reemplaza al
   proyecto: no guarda en JSON y el ingreso queda saltado.

   Uso: node herramientas/construir.mjs
   -------------------------------------------------------------------------- */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..');
const leer = p => readFile(join(RAIZ, p), 'utf8');

const ORDEN = [
  'js/config.js', 'js/utilidades.js', 'js/almacen.js', 'js/negocio.js',
  'js/auth.js', 'js/estado.js', 'js/componentes.js',
  'js/vistas/panel.js', 'js/vistas/productos.js', 'js/vistas/vender.js',
  'js/vistas/importar.js', 'js/vistas/caja.js', 'js/vistas/informes.js',
  'js/vistas/ajustes.js', 'js/app.js'
];

/* Se sacan los import/export: al quedar todo en un solo ámbito, sobran. */
const aplanar = txt => txt
  .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, () => '')
  .replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, () => '')
  .replace(/^export\s+(const|let|function|async function|class)/gm, (m, g) => g)
  .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, () => '');

const html     = await leer('index.html');
const css      = await leer('css/estilos.css');
const usuarios = await leer('datos/usuarios.json');
const inicial  = await leer('datos/inicial.json');

let js = '';
for (const p of ORDEN) js += `\n/* ===== ${p} ===== */\n` + aplanar(await leer(p));

/* En un solo archivo no hay fetch que valga: los JSON van incrustados y se
   sirven desde memoria interceptando las tres rutas que usa el programa. */
const puente = `
/* ===== puente de archivo único =====
   Acá no hay servidor ni archivos sueltos: los JSON van incrustados y se
   entregan interceptando las rutas que pide el programa. La respuesta imita
   lo justo de fetch que se usa (ok y json), sin depender de la clase Response,
   que no existe en todos los entornos. */
const ARCHIVOS = {
  'datos/usuarios.json': ${usuarios.trim()},
  'datos/inicial.json': ${inicial.trim()}
};
const respuesta = (cuerpo, ok) => Promise.resolve({
  ok, status: ok ? 200 : 404,
  json: () => Promise.resolve(cuerpo),
  text: () => Promise.resolve(JSON.stringify(cuerpo))
});
const fetchReal = typeof window.fetch === 'function'
  ? window.fetch.bind(window)
  : () => respuesta(null, false);
window.fetch = (url, opciones) => {
  const clave = String(url).replace(/^\\.?\\//, '');
  if (clave === 'api/base') return respuesta(null, false);
  if (ARCHIVOS[clave]) return respuesta(ARCHIVOS[clave], true);
  return fetchReal(url, opciones);
};
`;

/* Ojo: los reemplazos van como función, no como cadena. En una cadena de
   reemplazo, "$$" significa un "$" literal y "$1" un grupo capturado, así que
   el código (que usa $$ para querySelectorAll) saldría corrompido. */
const salida = html
  .replace('<link rel="stylesheet" href="css/estilos.css">', () => `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="js/app.js"></script>',
           () => `<script type="module">\n${puente}\n${js}\n</script>`);

await mkdir(join(RAIZ, 'dist'), { recursive: true });
await writeFile(join(RAIZ, 'dist', 'demo.html'), salida, 'utf8');

console.log('Listo: dist/demo.html (' + Math.round(salida.length / 1024) + ' KB)');
