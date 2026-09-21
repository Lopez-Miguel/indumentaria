/* Lo que la interfaz recuerda mientras la persona la usa.
   No se guarda en la base: si recarga la página, vuelve a los valores de acá. */

export const ui = {
  vista: 'panel',
  busqueda: '',
  rangoCaja: 'mes',
  rangoInforme: 'mes',
  ticket: [],
  previo: null,     // previsualización de la importación
  usuario: null
};

/* Puente hacia el router. app.js rellena estas dos funciones al arrancar.
   Evita que cada vista tenga que importar app.js, que a su vez las importa
   a ellas: sin esto quedaría una dependencia circular. */
export const bus = {
  pintar: () => {},
  ir: () => {}
};
