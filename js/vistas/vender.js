import { $, esc, plata, nid, avisar, hoyISO } from '../utilidades.js';
import { datos, guardar } from '../almacen.js';
import { buscar } from '../negocio.js';
import { claseTalle, vacio, buscador } from '../componentes.js';
import { ui, bus } from '../estado.js';

export function vistaVender(){
  $('#acciones').innerHTML = buscador(ui.busqueda);

  const lista = buscar(ui.busqueda);
  const total = ui.ticket.reduce((a, i) => a + i.precioC * i.cant, 0);
  const costo = ui.ticket.reduce((a, i) => a + i.costoC * i.cant, 0);
  const prendas = ui.ticket.reduce((a, i) => a + i.cant, 0);

  $('#hoja').innerHTML = `<div class="venta">
    <div>${lista.length ? `<div class="catalogo">${lista.map(p => `
      <div class="item">
        <h4>${esc(p.nombre)}</h4>
        <div class="cat">${esc(p.categoria || 'Sin categoría')}</div>
        <div class="precio num">${plata(p.precioC)}</div>
        <div class="talles">${Object.entries(p.talles || {}).map(([t, c]) => `
          <button class="talle ${claseTalle(c)}" ${c === 0 ? 'disabled' : ''}
            data-sumar="${p.id}" data-talle="${esc(t)}" title="${c} en stock">
            <b>${esc(t)}</b><small>${c}</small></button>`).join('')}</div>
      </div>`).join('')}</div>`
      : `<section class="tarjeta">${vacio({
          titulo:'No hay prendas para vender',
          texto:'Cargá productos o revisá la búsqueda.' })}</section>`}
    </div>

    <aside class="tarjeta ticket">
      <div class="tarjeta-tope"><h3>Ticket</h3>
        ${ui.ticket.length
          ? '<button class="btn chico plano" id="vaciar-ticket" style="margin-left:auto">Vaciar</button>'
          : ''}
      </div>
      ${ui.ticket.length ? `
        <div class="ticket-lineas">${ui.ticket.map((i, ix) => `
          <div class="linea">
            <div class="n">${esc(i.nombre)}</div>
            <div class="m num">${plata(i.precioC * i.cant)}</div>
            <div class="d">Talle ${esc(i.talle)} · ${i.cant} × ${plata(i.precioC)}</div>
            <button class="quitar" data-quitar="${ix}">Quitar</button>
          </div>`).join('')}</div>
        <div class="ticket-pie">
          <div class="total-fila"><span>Prendas</span><span class="num">${prendas}</span></div>
          <div class="total-fila"><span>Ganancia de esta venta</span>
            <span class="num pos">${plata(total - costo)}</span></div>
          <div class="total-fila grande"><span>Total</span><b class="num">${plata(total)}</b></div>
          <button class="btn primario" id="cobrar" style="width:100%">Confirmar venta</button>
        </div>`
      : vacio({ titulo:'Ticket vacío', texto:'Tocá el talle de una prenda para sumarla.' })}
    </aside>
  </div>`;

  const q = $('#q');
  if (q) q.oninput = e => {
    ui.busqueda = e.target.value;
    const pos = e.target.selectionStart;
    vistaVender();
    const n = $('#q');
    if (n){ n.focus(); n.setSelectionRange(pos, pos); }
  };
}

export function sumarAlTicket(productoId, talle){
  const p = datos.productos.find(x => x.id === productoId);
  if (!p) return;

  const yaPuesto = ui.ticket
    .filter(i => i.productoId === productoId && i.talle === talle)
    .reduce((a, i) => a + i.cant, 0);

  if (yaPuesto >= (p.talles[talle] || 0)){
    avisar(`Solo quedan ${p.talles[talle]} en talle ${talle}`, true);
    return;
  }

  const linea = ui.ticket.find(i => i.productoId === productoId && i.talle === talle);
  if (linea) linea.cant++;
  else ui.ticket.push({ productoId, nombre: p.nombre, talle, cant: 1,
                        precioC: p.precioC, costoC: p.costoC });
  vistaVender();
}

export function confirmarVenta(){
  if (!ui.ticket.length) return;

  const totalC = ui.ticket.reduce((a, i) => a + i.precioC * i.cant, 0);
  const costoC = ui.ticket.reduce((a, i) => a + i.costoC * i.cant, 0);

  ui.ticket.forEach(i => {
    const p = datos.productos.find(x => x.id === i.productoId);
    if (p && p.talles[i.talle] !== undefined)
      p.talles[i.talle] = Math.max(0, p.talles[i.talle] - i.cant);
  });

  /* El precio y el costo quedan congelados dentro de la venta. Si mañana
     cambia el margen del producto, la ganancia de hoy no se reescribe. */
  datos.ventas.push({
    id: nid(), fecha: hoyISO(),
    items: ui.ticket.map(i => ({ ...i })),
    totalC, gananciaC: totalC - costoC
  });

  guardar();
  const n = ui.ticket.reduce((a, i) => a + i.cant, 0);
  ui.ticket = [];
  bus.pintar();
  avisar(`Venta registrada: ${plata(totalC)} · ${n} ${n === 1 ? 'prenda' : 'prendas'}`);
}
