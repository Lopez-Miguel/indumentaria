import { $, esc, plataCorta } from '../utilidades.js';
import { datos } from '../almacen.js';
import { rango, resumen, activos, stockDe, valorStockCosto, valorStockVenta,
         productosEnAlerta, tallesBajos } from '../negocio.js';
import { cifra, talle, vacio } from '../componentes.js';

export function vistaPanel(){
  $('#acciones').innerHTML = '';

  const hoy = resumen(rango('hoy'));
  const inv = activos();
  const costoInv = inv.reduce((a, p) => a + valorStockCosto(p), 0);
  const ventaInv = inv.reduce((a, p) => a + valorStockVenta(p), 0);
  const unidades = inv.reduce((a, p) => a + stockDe(p), 0);
  const alerta = productosEnAlerta();

  $('#hoja').innerHTML = `
    <dl class="cifras">
      ${cifra({ titulo:'Hoy', valor: plataCorta(hoy.vendido), acento: true,
                pie:`${hoy.ventas.length} ${hoy.ventas.length === 1 ? 'venta' : 'ventas'}` })}
      ${cifra({ titulo:'Unidades en stock', valor: unidades,
                pie:`${inv.length} productos distintos` })}
      ${cifra({ titulo:'Invertido en mercadería', valor: plataCorta(costoInv),
                pie:'a precio de costo' })}
      ${cifra({ titulo:'Si vendés todo', valor: plataCorta(ventaInv),
                pie:`${plataCorta(ventaInv - costoInv)} de ganancia` })}
    </dl>

    <section class="tarjeta">
      <div class="tarjeta-tope">
        <h3>Reponer pronto</h3>
        <button class="btn chico plano" data-ir="productos" style="margin-left:auto">Ver productos</button>
      </div>
      ${alerta.length ? `
        <div class="tabla-env"><table><tbody>
          ${alerta.map(p => `
            <tr>
              <td><div class="prod-nombre">${esc(p.nombre)}</div>
                  <div class="prod-cat">${esc(p.categoria || 'Sin categoría')}</div></td>
              <td class="der"><div class="talles" style="justify-content:flex-end">
                ${tallesBajos(p).map(([t, c]) => talle(t, c)).join('')}</div></td>
            </tr>`).join('')}
        </tbody></table></div>`
      : vacio({ titulo:'Todo con stock',
                texto:`Ningún talle bajó de ${datos.umbral} unidades.` })}
    </section>`;
}
