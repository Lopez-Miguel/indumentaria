/* Todo lo que se toca al mover el proyecto de lugar vive acá. */

export const RUTAS = {
  usuarios: 'datos/usuarios.json',   // usuarios y contraseñas (hash)
  inicial:  'datos/inicial.json',    // base de arranque
  api:      'api/base'               // solo existe si corrés servidor/servidor.mjs
};

export const CLAVE_LOCAL  = 'indumentaria.base.v1';
export const CLAVE_SESION = 'indumentaria.sesion';

/* Cantidad por defecto a partir de la cual un talle se marca como "reponer".
   Después se puede cambiar desde Ajustes y queda guardado en la base. */
export const UMBRAL_POR_DEFECTO = 2;
