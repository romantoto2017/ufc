// El juego no tiene sonido (ni música ni efectos). Se mantiene la interfaz para no tocar a quienes la llaman.
const noop = () => {};
export const audio = { unlock: noop, setVolumes: noop, play: noop, roar: noop, startCrowd: noop, setCrowd: noop, stopCrowd: noop, startMusic: noop, stopMusic: noop };

export function vibrate(pattern, enabled) {
  if (enabled && navigator.vibrate) { try { navigator.vibrate(pattern); } catch { /* sin soporte */ } }
}
