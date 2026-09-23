import { $, esc, plataCorta } from '../utilidades.js';
import { datos } from '../almacen.js';
import { rango, resumen, activos, stockDe, valorStockCosto, valorStockVenta,
         productosEnAlerta, tallesBajos } from '../negocio.js';
import { cifra, grafico, talle, vacio } from '../componentes.js';

export function vistaPanel(){
  $('#acciones').innerHTML = `
    <button class="btn" data-ir="importar">Importar stock</button>
    <button class="btn primario" data-ir="vender">Registrar venta</button>`;

  const mes = resumen(rango('mes'));
  const hoy = resumen(rango('hoy'));
  const inv = activos();
  const costoInv = inv.reduce((a, p) => a + valorStockCosto(p), 0);
  const ventaInv = inv.reduce((a, p) => a + valorStockVenta(p), 0);
  const unidades = inv.reduce((a, p) => a + stockDe(p), 0);
  const alerta = productosEnAlerta();

  $('#hoja').innerHTML = `
    <dl class="cifras">
      ${cifra({ titulo:'Vendido este mes', valor: plataCorta(mes.vendido), acento: true,
                pie: `${mes.ventas.length} ventas · ${mes.unidades} productos` })}
      ${cifra({ titulo:'Ganancia del mes', valor: plataCorta(mes.ganancia), tono:'pos',
                pie: `${mes.vendido ? Math.round(mes.ganancia / mes.vendido * 100) : 0}% sobre lo vendido` })}
      ${cifra({ titulo:'Egresos del mes', valor: plataCorta(mes.egresos), tono:'neg',
                pie: `${mes.movs.filter(m => m.tipo === 'egreso').length} movimientos` })}
      ${cifra({ titulo:'Balance del mes', valor: plataCorta(mes.balance),
                tono: mes.balance >= 0 ? 'pos' : 'neg', pie:'Ingresos menos egresos' })}
    </dl>

    <div style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
      <section class="tarjeta">
        <div class="tarjeta-tope"><h3>Ventas de los últimos 14 días</h3></div>
        <div class="tarjeta-cuerpo">${grafico(14)}</div>
      </section>

      <section class="tarjeta">
        <div class="tarjeta-tope">
          <h3>Reponer pronto</h3>
          <button class="btn chico plano" data-ir="productos" style="margin-left:auto">Ver productos</button>
        </div>
        ${alerta.length ? `
          <div class="tabla-env"><table><tbody>
            ${alerta.slice(0, 7).map(p => `
              <tr>
                <td><div class="prod-nombre">${esc(p.nombre)}</div>
                    <div class="prod-cat">${esc(p.categoria || 'Sin categoría')}</div></td>
                <td class="der"><div class="talles" style="justify-content:flex-end">
                  ${tallesBajos(p).map(([t, c]) => talle(t, c)).join('')}</div></td>
              </tr>`).join('')}
          </tbody></table></div>
          ${alerta.length > 7 ? `<div style="padding:10px 16px;font-size:13px;color:var(--tinta-3)">
            y ${alerta.length - 7} productos más</div>` : ''}
        ` : vacio({ titulo:'Todo con stock',
                    texto:`Ningún talle bajó de ${datos.umbral} unidades.` })}
      </section>
    </div>

    <dl class="cifras" style="margin-top:16px">
      ${cifra({ titulo:'Hoy', valor: plataCorta(hoy.vendido), pie:`${hoy.ventas.length} ventas` })}
      ${cifra({ titulo:'Unidades en stock', valor: unidades,
                pie:`${inv.length} productos distintos` })}
      ${cifra({ titulo:'Invertido en mercadería', valor: plataCorta(costoInv), pie:'a precio de costo' })}
      ${cifra({ titulo:'Si vendés todo', valor: plataCorta(ventaInv),
                pie:`${plataCorta(ventaInv - costoInv)} de ganancia` })}
    </dl>`;
}
