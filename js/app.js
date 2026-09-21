/* Punto de entrada: arma el router, engancha los eventos y arranca. */

import { $, $$, esc, fechaLarga, avisar, cerrarDialogo } from './utilidades.js';
import { arrancar, modo, guardarYa } from './almacen.js';
import { productosEnAlerta } from './negocio.js';
import { ui, bus } from './estado.js';
import { verificar, recordarSesion, sesionActiva, cerrarSesion } from './auth.js';

import { vistaPanel }                                  from './vistas/panel.js';
import { vistaProductos, editorProducto }              from './vistas/productos.js';
import { vistaVender, sumarAlTicket, confirmarVenta }  from './vistas/vender.js';
import { vistaImportar }                               from './vistas/importar.js';
import { vistaCaja, editorMovimiento, deshacer, alternarDetalle } from './vistas/caja.js';
import { vistaInformes }                               from './vistas/informes.js';
import { vistaAjustes }                                from './vistas/ajustes.js';

const VISTAS = {
  panel:     { titulo: 'Panel',           sub: 'Cómo viene el negocio',                  pintar: vistaPanel },
  vender:    { titulo: 'Vender',          sub: 'Tocá un talle para sumarlo al ticket',   pintar: vistaVender },
  productos: { titulo: 'Productos',       sub: '',                                        pintar: vistaProductos },
  importar:  { titulo: 'Importar stock',  sub: 'Pegá las filas copiadas de tu planilla', pintar: vistaImportar },
  caja:      { titulo: 'Caja',            sub: 'Ventas, ingresos y egresos',             pintar: vistaCaja },
  informes:  { titulo: 'Informes',        sub: '',                                        pintar: vistaInformes },
  ajustes:   { titulo: 'Ajustes',         sub: 'Respaldo y preferencias',                pintar: vistaAjustes }
};

/* --------------------------------------------------------------------------
   ROUTER
   -------------------------------------------------------------------------- */
function pintar(){
  const v = VISTAS[ui.vista] || VISTAS.panel;
  $('#titulo').textContent = v.titulo;
  $('#subtitulo').textContent = v.sub;
  $('#rail-fecha').textContent = fechaLarga.format(new Date());

  const alerta = productosEnAlerta().length;
  const marca = $('#marca-stock');
  marca.hidden = alerta === 0;
  marca.textContent = alerta;

  v.pintar();
}

function ir(destino){
  ui.vista = destino;
  ui.busqueda = '';
  $$('#nav button').forEach(b =>
    b.setAttribute('aria-current', String(b.dataset.vista === destino)));
  $('#lienzo').scrollTop = 0;
  pintar();
}

bus.pintar = pintar;
bus.ir = ir;

/* --------------------------------------------------------------------------
   EVENTOS
   Uno solo para toda la aplicación: las vistas se redibujan enteras, así que
   enganchar oyentes a cada botón se perdería en el siguiente repintado.
   -------------------------------------------------------------------------- */
document.addEventListener('click', ev => {
  const t = ev.target;

  const nav = t.closest('#nav button');
  if (nav){ ir(nav.dataset.vista); return; }

  const atajo = t.closest('[data-ir]');
  if (atajo){ ir(atajo.dataset.ir); return; }

  if (t.closest('[data-cerrar]') || t.id === 'velo'){ cerrarDialogo(); return; }

  /* productos */
  const editar = t.closest('[data-editar]');
  if (editar){ editorProducto(editar.dataset.editar); return; }
  if (t.id === 'nuevo-producto'){ editorProducto(null); return; }

  /* vender */
  const sumar = t.closest('[data-sumar]');
  if (sumar && !sumar.disabled){ sumarAlTicket(sumar.dataset.sumar, sumar.dataset.talle); return; }
  const quitar = t.closest('[data-quitar]');
  if (quitar){ ui.ticket.splice(+quitar.dataset.quitar, 1); vistaVender(); return; }
  if (t.id === 'vaciar-ticket'){ ui.ticket = []; vistaVender(); return; }
  if (t.id === 'cobrar'){ confirmarVenta(); return; }

  /* caja */
  if (t.id === 'nuevo-egreso'){ editorMovimiento('egreso'); return; }
  if (t.id === 'nuevo-ingreso'){ editorMovimiento('ingreso'); return; }
  const des = t.closest('[data-deshacer]');
  if (des){ deshacer(des.dataset.deshacer, des.dataset.clase); return; }
  const ver = t.closest('[data-ver]');
  if (ver){ alternarDetalle(ver.dataset.ver); return; }

  /* rangos */
  const rc = t.closest('[data-rango-caja]');
  if (rc){ ui.rangoCaja = rc.dataset.rangoCaja; vistaCaja(); return; }
  const ri = t.closest('[data-rango-informe]');
  if (ri){ ui.rangoInforme = ri.dataset.rangoInforme; vistaInformes(); return; }

  /* sesión */
  if (t.id === 'salir'){ salir(); return; }
});

document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') cerrarDialogo();
});

/* Si quedó algo sin escribir y se cierra la pestaña, se fuerza el guardado. */
window.addEventListener('beforeunload', () => { guardarYa(); });

/* --------------------------------------------------------------------------
   INGRESO
   -------------------------------------------------------------------------- */
async function entrar(){
  const usuario = $('#ing-usuario').value;
  const clave   = $('#ing-clave').value;
  const btn = $('#ing-entrar');
  btn.disabled = true;

  try{
    const u = await verificar(usuario, clave);
    if (!u){
      $('#ing-error').textContent = 'Usuario o contraseña incorrectos.';
      $('#ing-error').hidden = false;
      $('#ing-clave').value = '';
      $('#ing-clave').focus();
      return;
    }
    recordarSesion(u);
    await abrirApp(u);
  }catch(e){
    $('#ing-error').textContent = 'No se pudo leer datos/usuarios.json.';
    $('#ing-error').hidden = false;
  }finally{
    btn.disabled = false;
  }
}

async function abrirApp(u){
  ui.usuario = u;
  $('#ingreso').hidden = true;
  $('#app').hidden = false;
  $('#rail-usuario').textContent = u.nombre;
  $('#marca-modo').textContent = modo === 'servidor' ? 'Guardando en el JSON' : 'Guardando en este equipo';
  ir('panel');
}

function salir(){
  cerrarSesion();
  ui.usuario = null;
  ui.ticket = [];
  $('#app').hidden = true;
  $('#ingreso').hidden = false;
  $('#ing-clave').value = '';
  $('#ing-error').hidden = true;
}

/* --------------------------------------------------------------------------
   ARRANQUE
   -------------------------------------------------------------------------- */
(async function inicio(){
  $('#ing-entrar').onclick = entrar;
  $('#ing-clave').addEventListener('keydown', e => { if (e.key === 'Enter') entrar(); });
  $('#ing-usuario').addEventListener('keydown', e => { if (e.key === 'Enter') $('#ing-clave').focus(); });

  await arrancar();

  const u = sesionActiva();
  if (u) await abrirApp(u);
  else $('#ing-usuario').focus();
})();
