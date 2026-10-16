# Pixel MMA

Juego de MMA en pixel art para el celular, en horizontal. Es una web app con HTML, JavaScript y canvas, instalable como PWA y pensada para uso personal. No hace falta compilar nada.

## Probar

```bash
npm run serve        # http://localhost:8080
npm test             # tests: simulación, motor IA vs IA, roster y carrera completa
```

Para el celular: GitHub Pages (Settings → Pages → rama `claude/bold-wozniak-8a0tk5`, carpeta raíz). Después lo abrís en el teléfono y lo instalás ("Agregar a pantalla principal").

**Controles (clásico, por defecto):** un botón por golpe (jab, recto, gancho, codazo, patada baja, media, alta, giratoria y derribo). En Configuración se puede elegir el esquema de 2 botones: PUÑO (1 toque jab, 2 recto, 3 gancho, 4 codazo, siempre tocando seguido) y PATADA (baja, media, alta y giratoria). Hay un **Tutorial** en el menú, que se adapta al esquema elegido.

**Pelea:** spamear golpes no sirve. Cada golpe suma "carga" y, si tirás sin pausa, el rival te esquiva y te contragolpea con el doble de daño (con buena pegada te puede noquear). Además pegás más flojo, te cansás más y tardás más en recuperarte. Los puños noquean más que antes y la pegada (golpeo) pesa en el knockdown. Cuando tirás a alguien, te le tirás encima solo para rematarlo con ground and pound: si no se cubre, el árbitro para la pelea por TKO.

En el ordenador: A/D o las flechas para moverse, W/S para bloquear alto/bajo, J = puño, K = patada, H = derribo y Espacio para tocar en las sumisiones.

## Qué tiene

- **Pelea clásica**:
  - 8 divisiones, 223 peleadores reales (campeón + 15 rankeados + 12 no rankeados por división) y todos se pueden usar.
  - Modo jugado o simulado.
- **Modo carrera**:
  - Creás tu peleador (país, edad, división, altura, alcance, estilo, guardia y cara) o tomás uno real.
  - Escalera: circuito nacional, después la organización regional, después el Contender Series (o Road to UFC si sos asiático) y por último UFC. PFL aparece como alternativa.
  - Rivales genéricos coherentes y guardados (puede haber revanchas), entrenamiento, gimnasio y dinero.
  - Experiencia: ~5 peleas para la primera promotora y entre 10 y 16 (a veces más) para llegar a UFC.
  - 18 habilidades especiales en 3 niveles (común, avanzada, legendaria) con atributos mínimos. Los puntos salen solo de pelear (+1 por victoria, +1 por KO o sumisión, +2 por título), así que en una carrera se consiguen 3 a 6: hay que elegir. Cambian la pelea jugada y también la simulación.
  - El mundo UFC se simula mes a mes: cambian récords, rankings, valoraciones y campeones.
- **Carrera realista**:
  - Lo normal es ~1 pelea por año y nunca más de 3 en 12 meses.
  - Retiro entre los 36 y los 40 (obligatorio a los 40).
  - Máximo 4 peleas contra el mismo rival.
  - Promotoras por nivel (Samurai/Naciones 1,5 → LFA/Cage Warriors/KSW 3 → ONE/RIZIN 3,5): ganando, te llegan ofertas de promotoras mejores.
  - Caminos a UFC aleatorios: el campeón de una promotora fuerte puede recibir un contrato directo de 1 o 2 peleas, también hay llamados de último momento, el Contender Series o el Road to UFC, y PFL.
  - Los contratos tienen una cantidad de peleas y se renuevan según tus resultados.
  - En el mundo UFC los veteranos se retiran y llegan prospectos nuevos. UFC corta a quien queda con récord no ganador o con 3 derrotas seguidas sin ranking.
  - Récords creíbles: en el circuito nacional nadie pasa de 10 peleas; desde Ares, Brave, Oktagon, LFA, etc. para arriba nadie tiene récord perdedor (tampoco vos: te cortan y bajás de nivel).
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
