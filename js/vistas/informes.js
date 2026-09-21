import { $, esc, plata, plataCorta, fechaLarga, hora, dia, bajar, aCSV, avisar }
  from '../utilidades.js';
import { rango, resumen, ranking } from '../negocio.js';
import { cifra, selectorRango, grafico, vacio } from '../componentes.js';
import { ui } from '../estado.js';

const DIAS_GRAFICO = { hoy: 7, '7': 7, mes: 30, '30': 30, todo: 30 };

export function vistaInformes(){
  const r = rango(ui.rangoInforme);
  const s = resumen(r);
  const { productos, talles } = ranking(s.ventas);
  const topTalle = talles.length ? talles[0][1] : 1;

  $('#subtitulo').textContent = ui.rangoInforme === 'todo'
    ? 'Todo el historial'
    : `Del ${fechaLarga.format(r.ini)} al ${fechaLarga.format(r.fin)}`;

  $('#acciones').innerHTML = `
    ${selectorRango(ui.rangoInforme, 'data-rango-informe')}
    <button class="btn" id="bajar-csv">Descargar CSV</button>`;

  $('#hoja').innerHTML = `
    <dl class="cifras">
      ${cifra({ titulo:'Vendido', valor: plataCorta(s.vendido), acento: true,
                pie:`${s.ventas.length} ventas` })}
      ${cifra({ titulo:'Ganancia', valor: plataCorta(s.ganancia), tono:'pos',
                pie:`${s.vendido ? Math.round(s.ganancia / s.vendido * 100) : 0}% de margen real` })}
      ${cifra({ titulo:'Prendas vendidas', valor: s.unidades,
                pie:`${s.ventas.length ? (s.unidades / s.ventas.length).toFixed(1) : 0} por venta` })}
      ${cifra({ titulo:'Ticket promedio', valor: plataCorta(s.ticket), pie:'por operación' })}
    </dl>

    <section class="tarjeta" style="margin-bottom:16px">
      <div class="tarjeta-tope"><h3>Ventas por día</h3></div>
      <div class="tarjeta-cuerpo">${grafico(DIAS_GRAFICO[ui.rangoInforme] || 30)}</div>
    </section>

    <div style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
      <section class="tarjeta">
        <div class="tarjeta-tope"><h3>Lo que más se vendió</h3></div>
        ${productos.length ? `<div class="tabla-env"><table>
          <thead><tr><th>Producto</th><th class="der">Unid.</th>
            <th class="der">Vendido</th><th class="der">Ganancia</th></tr></thead>
          <tbody>${productos.slice(0, 12).map(p => `
            <tr><td class="prod-nombre">${esc(p.nombre)}</td>
              <td class="der num">${p.unidades}</td>
              <td class="der num">${plata(p.totalC)}</td>
              <td class="der num pos">${plata(p.gananciaC)}</td></tr>`).join('')}</tbody>
        </table></div>` : vacio({ titulo:'Sin ventas en el período',
                                  texto:'Probá con un rango más amplio.' })}
      </section>

      <section class="tarjeta">
        <div class="tarjeta-tope"><h3>Talles que más salen</h3></div>
        <div class="tarjeta-cuerpo">
          ${talles.length ? talles.map(([t, c]) => `
            <div style="display:flex;align-items:center;gap:11px;margin-bottom:9px">
              <span style="width:44px;font-weight:600;font-size:14px">${esc(t)}</span>
              <div style="flex:1;height:22px;background:var(--superficie-2);border-radius:5px;overflow:hidden">
                <div style="width:${Math.round(c / topTalle * 100)}%;height:100%;
                            background:var(--marca);border-radius:5px"></div>
              </div>
              <span class="num" style="width:34px;text-align:right;font-size:13.5px">${c}</span>
            </div>`).join('')
            : '<p style="color:var(--tinta-3);margin:0">Sin datos todavía.</p>'}
        </div>
      </section>
    </div>`;

  $('#bajar-csv').onclick = () => {
    const filas = [['Fecha', 'Hora', 'Producto', 'Talle', 'Cantidad',
                    'Precio unitario', 'Total', 'Ganancia']];
    s.ventas
      .slice()
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .forEach(v => v.items.forEach(i => filas.push([
        dia(v.fecha), hora.format(new Date(v.fecha)), i.nombre, i.talle, i.cant,
        (i.precioC / 100).toFixed(2),
        (i.precioC * i.cant / 100).toFixed(2),
        ((i.precioC - i.costoC) * i.cant / 100).toFixed(2)
      ])));
    bajar(`ventas-${ui.rangoInforme}.csv`, aCSV(filas), 'text/csv;charset=utf-8');
    avisar('CSV descargado');
  };
}
