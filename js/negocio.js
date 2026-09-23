/* Cálculos puros sobre la base. No tocan el DOM ni guardan nada. */

import { datos } from './almacen.js';

export const precioDe = p => Math.round(p.costoC * (1 + p.margen / 100));
export const stockDe  = p => Object.values(p.talles || {}).reduce((a, b) => a + (b || 0), 0);

export const valorStockCosto = p => stockDe(p) * p.costoC;
export const valorStockVenta = p => stockDe(p) * p.precioC;

export const activos = () => datos.productos.filter(p => p.activo !== false);

export function tallesBajos(p){
  return Object.entries(p.talles || {}).filter(([, c]) => c <= datos.umbral);
}

export function productosEnAlerta(){
  return activos().filter(p => tallesBajos(p).length > 0);
}

export function buscar(texto){
  const q = (texto || '').trim().toLowerCase();
  let lista = activos();
  if (q) lista = lista.filter(p =>
    (p.nombre + ' ' + (p.categoria || '')).toLowerCase().includes(q));
  return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/* --------------------------------------------------------------------------
   RANGOS DE FECHA
   -------------------------------------------------------------------------- */
export const RANGOS = [
  ['hoy',  'Hoy'],
  ['7',    '7 días'],
  ['mes',  'Este mes'],
  ['30',   '30 días'],
  ['todo', 'Todo'],
  ['personalizado', 'Desde-hasta']
];

/* Acepta el objeto que guarda la interfaz: { clave, desde, hasta }.
   Con 'personalizado' mandan desde y hasta; con el resto se calcula solo.
   Las fechas llegan como 'AAAA-MM-DD' de un <input type="date">, así que se
   les pega la hora local a mano: hacerlo con new Date('2026-09-22') las
   interpretaría como UTC y en Argentina se correrían un día para atrás. */
export function rango(r){
  const clave = typeof r === 'string' ? r : (r && r.clave) || 'mes';

  if (clave === 'personalizado'){
    const ini = desdeTexto(r.desde, 0, 0, 0, 0);
    const fin = desdeTexto(r.hasta, 23, 59, 59, 999);
    if (!ini || !fin) return { ini: new Date(0), fin: new Date(), clave };
    /* Si las cargó al revés, se dan vuelta solas en lugar de no mostrar nada. */
    return ini <= fin ? { ini, fin, clave } : { ini: fin, fin: ini, clave, dadoVuelta: true };
  }

  const fin = new Date(); fin.setHours(23, 59, 59, 999);
  const ini = new Date();
  if (clave === 'hoy')        ini.setHours(0, 0, 0, 0);
  else if (clave === '7')   { ini.setDate(ini.getDate() - 6);  ini.setHours(0, 0, 0, 0); }
  else if (clave === '30')  { ini.setDate(ini.getDate() - 29); ini.setHours(0, 0, 0, 0); }
  else if (clave === 'mes') { ini.setDate(1); ini.setHours(0, 0, 0, 0); }
  else return { ini: new Date(0), fin, clave };
  return { ini, fin, clave };
}

function desdeTexto(txt, h, m, s, ms){
  if (!txt || !/^\d{4}-\d{2}-\d{2}$/.test(txt)) return null;
  const [a, me, d] = txt.split('-').map(Number);
  const f = new Date(a, me - 1, d, h, m, s, ms);
  return isNaN(f) ? null : f;
}

/* Cuántos días abarca un rango, para saber cuántas barras dibujar.
   Va con floor y no con round: el fin es a las 23:59:59, así que un rango de
   un solo día mide 0,99 días y round lo subiría a 2. */
export function diasDe(r){
  const uno = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.min(120, Math.floor((r.fin - r.ini) / uno) + 1));
}

const enRango = (iso, r) => { const t = new Date(iso); return t >= r.ini && t <= r.fin; };

/* --------------------------------------------------------------------------
   RESUMEN DE UN PERÍODO
   -------------------------------------------------------------------------- */
export function resumen(r){
  const ventas = datos.ventas.filter(v => enRango(v.fecha, r));
  const movs   = datos.movimientos.filter(m => enRango(m.fecha, r));

  const vendido  = ventas.reduce((a, v) => a + v.totalC, 0);
  const ganancia = ventas.reduce((a, v) => a + v.gananciaC, 0);
  const unidades = ventas.reduce((a, v) => a + v.items.reduce((x, i) => x + i.cant, 0), 0);
  const otrosIng = movs.filter(m => m.tipo === 'ingreso').reduce((a, m) => a + m.montoC, 0);
  const egresos  = movs.filter(m => m.tipo === 'egreso').reduce((a, m) => a + m.montoC, 0);

  return {
    ventas, movs, vendido, ganancia, unidades, otrosIng, egresos,
    ingresos: vendido + otrosIng,
    balance:  vendido + otrosIng - egresos,
    ticket:   ventas.length ? Math.round(vendido / ventas.length) : 0
  };
}

/* Ventas por día, para el gráfico de barras.
   Sin rango, los últimos `dias` días contando hacia atrás desde hoy.
   Con rango, exactamente los días que el rango abarca. */
export function porDia(dias, r){
  const cubos = [];
  const arranque = r ? new Date(r.ini) : new Date();
  if (!r) arranque.setDate(arranque.getDate() - (dias - 1));
  arranque.setHours(0, 0, 0, 0);
  const cuantos = r ? diasDe(r) : dias;

  for (let i = 0; i < cuantos; i++){
    const f = new Date(arranque); f.setDate(f.getDate() + i);
    const k = fechaLocal(f);
    const total = datos.ventas
      .filter(v => fechaLocal(new Date(v.fecha)) === k)
      .reduce((a, v) => a + v.totalC, 0);
    cubos.push({ f, total });
  }
  return cubos;
}

/* 'AAAA-MM-DD' en hora local. No sirve toISOString(): convierte a UTC y en
   Argentina las ventas de la tarde se irían al día siguiente. */
export function fechaLocal(f){
  return f.getFullYear() + '-' +
         String(f.getMonth() + 1).padStart(2, '0') + '-' +
         String(f.getDate()).padStart(2, '0');
}

/* Cuánto entró por cada forma de cobro. */
export function porMedioPago(ventas){
  const mapa = {};
  ventas.forEach(v => {
    const k = v.medioPago || 'otro';
    mapa[k] = mapa[k] || { medio: k, totalC: 0, ventas: 0 };
    mapa[k].totalC += v.totalC;
    mapa[k].ventas += 1;
  });
  return Object.values(mapa).sort((a, b) => b.totalC - a.totalC);
}

/* Cuánto vendió cada persona. */
export function porUsuario(ventas){
  const mapa = {};
  ventas.forEach(v => {
    const k = v.usuario || 'Desconocido';
    mapa[k] = mapa[k] || { usuario: k, totalC: 0, ventas: 0 };
    mapa[k].totalC += v.totalC;
    mapa[k].ventas += 1;
  });
  return Object.values(mapa).sort((a, b) => b.totalC - a.totalC);
}

/* Ranking de productos y de talles dentro de un conjunto de ventas. */
export function ranking(ventas){
  const porProducto = {};
  const porTalle = {};
  ventas.forEach(v => v.items.forEach(i => {
    const k = i.nombre;
    porProducto[k] = porProducto[k] || { nombre: k, unidades: 0, totalC: 0, gananciaC: 0 };
    porProducto[k].unidades  += i.cant;
    porProducto[k].totalC    += i.precioC * i.cant;
    porProducto[k].gananciaC += (i.precioC - i.costoC) * i.cant;
    porTalle[i.talle] = (porTalle[i.talle] || 0) + i.cant;
  }));
  return {
    productos: Object.values(porProducto).sort((a, b) => b.totalC - a.totalC),
    talles: Object.entries(porTalle).sort((a, b) => b[1] - a[1])
  };
}
