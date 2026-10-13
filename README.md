# Pixel MMA

Juego de MMA en pixel art para el celular, en horizontal. Es una web app con HTML, JavaScript y canvas, instalable como PWA y pensada para uso personal. No hace falta compilar nada.

## Probar

```bash
npm run serve        # http://localhost:8080
npm test             # tests: simulación, motor IA vs IA, roster y carrera completa
```

Para el celular: GitHub Pages (Settings → Pages → rama `claude/bold-wozniak-8a0tk5`, carpeta raíz). Después lo abrís en el teléfono y lo instalás ("Agregar a pantalla principal").

**Controles (2 botones, por defecto):** PUÑO (1 toque jab, 2 recto, 3 gancho, 4 codazo, siempre tocando seguido) y PATADA (baja, media, alta y giratoria). Se puede cambiar al esquema clásico en Configuración. Hay un **Tutorial** en el menú.

En el ordenador: A/D o las flechas para moverse, W/S para bloquear alto/bajo, J = puño, K = patada, H = derribo y Espacio para tocar en las sumisiones.

## Qué tiene

- **Pelea clásica**:
  - 8 divisiones, 223 peleadores reales (campeón + 15 rankeados + 12 no rankeados por división) y todos se pueden usar.
  - Modo jugado o simulado.
- **Modo carrera**:
  - Creás tu peleador (país, edad, división, altura, alcance, estilo, guardia y cara) o tomás uno real.
  - Escalera: circuito nacional, después la organización regional, después el Contender Series (o Road to UFC si sos asiático) y por último UFC. PFL aparece como alternativa.
  - Rivales genéricos coherentes y guardados (puede haber revanchas), entrenamiento, técnicas, gimnasio y dinero.
  - El mundo UFC se simula mes a mes: cambian récords, rankings, valoraciones y campeones.
- **Carrera realista**:
  - Lo normal es ~1 pelea por año y nunca más de 3 en 12 meses.
  - Retiro entre los 36 y los 40 (obligatorio a los 40).
  - Máximo 4 peleas contra el mismo rival.
  - Promotoras por nivel (Samurai/Naciones 1,5 → LFA/Cage Warriors/KSW 3 → ONE/RIZIN 3,5): ganando, te llegan ofertas de promotoras mejores.
  - Caminos a UFC aleatorios: el campeón de una promotora fuerte puede recibir un contrato directo de 1 o 2 peleas, también hay llamados de último momento, el Contender Series o el Road to UFC, y PFL.
  - Los contratos tienen una cantidad de peleas y se renuevan según tus resultados.
  - En el mundo UFC los veteranos se retiran y llegan prospectos nuevos.
- **Presentación**:
  - Intro con el presentador gritando "IT'S TIMEEE!".
  - Al terminar, el árbitro levanta el brazo del ganador, a veces con Dana White.
  - Conferencia de prensa y contrato que se firma manteniendo presionado.
  - Animación del cinturón cuando ganás un título.

## Datos (`/data`)

- `fighters.json` se genera con `python3 tools/roster/build.py <cache>`:
  - Toma "List of current UFC fighters" y las fichas individuales de Wikipedia, junto con los Meta Rankings del 03/10/2026 y el P4P de medios del 06/10/2026 (`tools/roster/rankings.json`).
  - **5 estrellas** = campeón o top 15 libra por libra, con un mínimo de 2 por división.
  - Lo que Wikipedia no trae (alcance, guardia o estilo de varios no rankeados) queda con `"verificar": true` y la lista `camposVerificar`.
  - Las caras son aproximadas (`"aproximada": true`).
  - Las correcciones manuales van en `tools/roster/overrides.json`.
- `promotions.json`:
  - Organizaciones verificadas como activas en 2026, regiones y qué organización le toca a cada región.
  - Bellator no aparece: PFL la cerró en 2025.
  - Naciones MMA es mexicana.
- `names.json`: nombres y apellidos por país, para los rivales genéricos.
- `settings.json`: configuración por defecto.

Los logos se cargan desde `assets/logos/<archivo>` (los nombres están en `promotions.json`). Si falta alguno, se dibuja uno provisional con el nombre.

## Estructura

```
js/ratings.js        atributos → estrellas; cálculo de atributos (élite = 5★)
js/sim.js            simulación (favorito máx. 92%) y actualización de récords/rankings
js/fight/            motor, golpes por estilo y técnicas, IA, render (ceremonia incluida)
js/career/           generator.js (rivales genéricos) y career.js (escalera, contratos, mundo UFC)
js/gfx/              caras, banderas, logos y escenas (Dana, presentador, árbitro, cinturón)
js/ui/               pantallas (clásica, pelea, carrera)
tools/roster/        generación del roster desde Wikipedia
```
