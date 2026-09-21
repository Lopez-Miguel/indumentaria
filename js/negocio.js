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
  ['todo', 'Todo']
];

export function rango(clave){
  const fin = new Date(); fin.setHours(23, 59, 59, 999);
  const ini = new Date();
  if (clave === 'hoy')        ini.setHours(0, 0, 0, 0);
  else if (clave === '7')   { ini.setDate(ini.getDate() - 6);  ini.setHours(0, 0, 0, 0); }
  else if (clave === '30')  { ini.setDate(ini.getDate() - 29); ini.setHours(0, 0, 0, 0); }
  else if (clave === 'mes') { ini.setDate(1); ini.setHours(0, 0, 0, 0); }
  else return { ini: new Date(0), fin, clave };
  return { ini, fin, clave };
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

/* Ventas por día, para el gráfico de barras. */
export function porDia(dias){
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const cubos = [];
  for (let i = dias - 1; i >= 0; i--){
    const f = new Date(hoy); f.setDate(f.getDate() - i);
    const k = f.toISOString().slice(0, 10);
    const total = datos.ventas
      .filter(v => v.fecha.slice(0, 10) === k)
      .reduce((a, v) => a + v.totalC, 0);
    cubos.push({ f, total });
  }
  return cubos;
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
