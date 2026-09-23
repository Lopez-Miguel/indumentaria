/* Lo que la interfaz recuerda mientras la persona la usa.
   No se guarda en la base: si recarga la página, vuelve a los valores de acá. */

import { MEDIO_POR_DEFECTO } from './config.js';

const hoyTexto = () => new Date().toISOString().slice(0, 10);
const primeroDelMes = () => {
  const f = new Date(); f.setDate(1);
  return f.toISOString().slice(0, 10);
};

export const ui = {
  vista: 'panel',
  busqueda: '',

  /* Caja e informes comparten la forma del rango: una clave de preajuste
     ('hoy', '7', 'mes', '30', 'todo') o 'personalizado', y en ese caso
     mandan `desde` y `hasta`. */
  rangoCaja:    { clave: 'mes', desde: primeroDelMes(), hasta: hoyTexto() },
  rangoInforme: { clave: 'mes', desde: primeroDelMes(), hasta: hoyTexto() },

  carrito: [],
  medioPago: MEDIO_POR_DEFECTO,

  previo: null,     // previsualización de la importación
  usuario: null     // { usuario, nombre } de quien inició sesión
};

/* Quién está operando, para dejarlo grabado en lo que se registra. */
export const quienOpera = () => ui.usuario ? ui.usuario.nombre : 'Desconocido';

/* Puente hacia el router. app.js rellena estas dos funciones al arrancar.
   Evita que cada vista tenga que importar app.js, que a su vez las importa
   a ellas: sin esto quedaría una dependencia circular. */
export const bus = {
  pintar: () => {},
  ir: () => {}
};
