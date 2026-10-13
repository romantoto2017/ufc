# Pixel MMA — Fase 1 (menú + motor de pelea)

Juego de MMA en pixel art para móvil, en horizontal: web app con HTML, JavaScript y canvas, instalable como PWA. Es para uso personal y no hace falta compilar nada.

## Probar

```bash
npm run serve        # http-server en http://localhost:8080
npm test             # tests de simulación y de motor (IA vs IA sin gráficos)
node tools/balance.mjs 300 60   # diagnóstico de equilibrio del motor
```

Para el móvil: publica el repo con GitHub Pages (Settings → Pages → rama). Ábrelo en el teléfono y usa "Instalar app" o "Añadir a pantalla de inicio". El service worker necesita HTTPS, o `localhost` en el ordenador.

En el ordenador: A/D o las flechas para moverse, W/S para bloquear alto/bajo, J/K/L/U/I/O/H para los golpes y Espacio para tocar en las sumisiones.

## Estructura

```
data/       fighters.json, promotions.json, names.json, settings.json (todo editable)
lang/       es.json, en.json (textos de la interfaz)
assets/logos/  PNG de las organizaciones (si falta uno, se dibuja un logo provisional)
js/ratings.js  atributos → estrellas (0,5–5); cálculo de atributos desde ranking/récord/racha/estilo
js/sim.js      simulación realista y actualización de récords/rankings/valoraciones
js/fight/      motor (engine), golpes por estilo (moves), IA (ai), dibujo (render)
js/gfx/        caras por partes, banderas por código, logos
js/ui/         pantallas
tools/         derive-attributes.mjs, balance.mjs, make-icons.py
```

### Datos de peleadores
- Las estrellas se recalculan siempre desde los `atributos` al cargar. Si editas atributos, las estrellas cambian solas.
- `fuente: "calculado"`: atributos generados con `node tools/derive-attributes.mjs --force`, a partir de ranking, récord, racha y estilo, más `ajustesPerfil` (por ejemplo, el récord de sumisiones).
- `verificar: true` marca lo que no se pudo confirmar.
- Datos verificados el 13/10/2026: Gaethje es campeón de ligero desde el 14/06/2026 (TKO a Topuria) y Topuria es el #1. Fuente: Meta Rankings del 03/10/2026.

## Limitaciones conocidas de la Fase 1
- Las peleas de exhibición no cambian récords. `applyResult` ya está hecho y probado, y se usará en la carrera (Fase 3).
- En IA contra IA, un luchador de élite contra un striker con poca defensa de derribo gana casi siempre por sumisión. El modo **Simular** usa la fórmula calibrada (máximo 92 %), no este motor.
- Solo hay 2 peleadores (ligero). El resto de divisiones aparece desactivado hasta la Fase 2.
