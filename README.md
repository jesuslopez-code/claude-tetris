# Tetris

Implementación del clásico **Tetris** en JavaScript vanilla, usando HTML5 Canvas y CSS. Sin dependencias externas, sin frameworks, sin proceso de build: solo abrir y jugar.

![Tech](https://img.shields.io/badge/HTML5-Canvas-orange)
![Tech](https://img.shields.io/badge/CSS3-blueviolet)
![Tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## Tabla de contenidos

- [Tetris](#tetris)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Qué hace el proyecto](#qué-hace-el-proyecto)
  - [Modos de juego](#modos-de-juego)
  - [Mecánicas avanzadas](#mecánicas-avanzadas)
    - [Reserva de pieza (hold)](#reserva-de-pieza-hold)
    - [Multiplicador de combo](#multiplicador-de-combo)
    - [Piezas especiales](#piezas-especiales)
    - [Habilidades cargables](#habilidades-cargables)
  - [Cómo ejecutar el juego](#cómo-ejecutar-el-juego)
    - [Opción 1: abrir el archivo directamente](#opción-1-abrir-el-archivo-directamente)
    - [Opción 2: servidor local (recomendado)](#opción-2-servidor-local-recomendado)
  - [Controles](#controles)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. `game.js`](#3-gamejs)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Personalización](#personalización)
  - [Licencia](#licencia)

---

## Qué hace el proyecto

Es una versión jugable del Tetris clásico con todas las mecánicas que esperarías:

- Tablero de **10 × 20** celdas.
- Las **7 piezas estándar** (I, O, T, S, Z, J, L) con colores diferenciados.
- **Rotación** con _wall kicks_ básicos (pequeños desplazamientos para que la pieza pueda rotar pegada a la pared).
- **Soft drop** (bajada acelerada) y **hard drop** (caída instantánea).
- **Pieza fantasma** (_ghost piece_): muestra dónde aterrizará la pieza actual.
- **Vista previa** de la siguiente pieza.
- **Sistema de puntuación** clásico de Tetris (100 / 300 / 500 / 800 multiplicado por nivel).
- **Niveles** que aumentan cada 10 líneas y aceleran la caída.
- **Pausa** y **Game Over** con opción de reinicio.
- **Tema claro / oscuro** conmutable (se recuerda entre partidas).

Y añade varias mecánicas propias: **reserva de pieza**, **multiplicador de combo**, **piezas especiales**, **habilidades cargables** y un **modo desafío**.

---

## Modos de juego

Al cargar el juego se elige el modo, y la elección se recuerda en `localStorage`:

| Modo        | Descripción                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Clásico** | Tablero vacío. Tetris de siempre, con hold, combos y habilidades.                                                          |
| **Desafío** | El tablero arranca con **6 filas pre-colocadas** (con 2–4 huecos por fila) y aparece la **pieza 3×3 hueca** como obstáculo. |

---

## Mecánicas avanzadas

### Reserva de pieza (hold)

Con `C` o `Shift` la pieza actual se guarda en el slot **HOLD** del panel lateral y llega la siguiente. Si el slot ya estaba ocupado, ambas piezas se intercambian. Solo se puede reservar **una vez por turno**: hay que bloquear una pieza para volver a tener el hold disponible. La pieza guardada vuelve siempre en su orientación original.

### Multiplicador de combo

Limpiar líneas en **turnos consecutivos** multiplica la puntuación: la primera limpieza va a x1, la segunda a x2, la tercera a x3… sin límite. Bloquear una pieza sin limpiar ninguna línea reinicia la racha. El panel muestra el multiplicador activo a partir de x2.

Puntuación final = `LINE_SCORES[líneas] × nivel × combo`.

### Piezas especiales

| Pieza              | Cómo se obtiene                          | Efecto                                                                                     |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Bomba** (1×1)    | Habilidad (tecla `1`)                    | Al aterrizar **no se fija**: destruye el área **3×3** a su alrededor (50 puntos por bloque) |
| **Single** (1×1)   | Recompensa automática al hacer un Tetris | Pieza de una sola celda, ideal para rellenar huecos estrechos                               |
| **Hueca** (3×3)    | Aleatoria (8%), solo en modo desafío     | Marco 3×3 con el **centro vacío**: deja un agujero al colocarla                             |

La bomba no aplica gravedad tras explotar (los huecos que abre se quedan ahí) y su turno es neutro: no alimenta el combo, pero tampoco lo rompe. La bomba y la single no rotan.

### Habilidades cargables

Cada línea limpiada llena la **barra de carga** del panel. Cada **4 líneas** otorgan un uso de habilidad, acumulables hasta **3**. Los usos se gastan con:

- `1` — convierte la pieza actual en **bomba**.
- `2` — convierte la pieza actual en **pieza 1×1**.

Si la pieza especial no cabe en la posición actual, el uso **no se consume**.

---

## Cómo ejecutar el juego

No hay nada que instalar ni compilar. Tienes dos opciones:

### Opción 1: abrir el archivo directamente

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Opción 2: servidor local (recomendado)

Cualquier servidor estático funciona. Algunos ejemplos:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Después abre `http://localhost:8000` en el navegador.

---

## Controles

| Tecla     | Acción                            |
| --------- | --------------------------------- |
| `←` / `→` | Mover la pieza horizontalmente    |
| `↑` o `X` | Rotar la pieza en sentido horario |
| `↓`       | Soft drop (bajar más rápido)      |
| `Espacio` | Hard drop (caída instantánea)     |
| `C` o `Shift` | Reservar la pieza actual (hold) |
| `1`       | Habilidad: bomba 3×3              |
| `2`       | Habilidad: pieza 1×1              |
| `P`       | Pausar / reanudar                 |

---

## Cómo funciona

El juego se compone de tres archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, vista de la siguiente pieza y la lista de controles.
- Un overlay para los estados **PAUSA** y **GAME OVER**.

### 2. `style.css`

Aporta el aspecto visual con estética _dark / retro arcade_: fondo oscuro, tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays.

### 3. `game.js`

Contiene toda la lógica del juego. A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía) o un índice de color (1–10) que identifica la pieza (1–7 tetrominós, 8–10 especiales).
- **Piezas**: definidas como matrices cuadradas. Para rotar se calcula la transposición + reverso de filas (`rotateCW`).
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval`.
- **Limpieza de líneas** (`clearLines`): recorre el tablero de abajo hacia arriba; cada fila completa se elimina y se inserta una vacía en la cima.
- **Puntuación**: usa la tabla clásica `[0, 100, 300, 500, 800]` multiplicada por el nivel actual y por el combo; el hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila.
- **Explosión** (`explode`): la bomba borra las celdas del área 3×3 centrada en su posición y dispara un destello dibujado dentro del propio bucle de animación (sin `setTimeout`, así la pausa lo congela).
- **Carga de habilidades** (`addCharge`, `useSkill`): la carga sube con cada línea; `useSkill` sustituye la pieza actual por la especial y aborta sin gastar el uso si no cabe.
- **Nivel y velocidad**: el nivel sube cada 10 líneas; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.

### Flujo del juego

```
init()
  ├─ createBoard()                  → matriz vacía
  ├─ next = randomPiece()
  ├─ spawn()                        → mueve next a current y genera nueva next
  └─ requestAnimationFrame(loop)
        ↓
   loop(timestamp)
     ├─ acumula dt
     ├─ si dt ≥ dropInterval → baja la pieza o llama a lockPiece()
     ├─ draw()  (grid + tablero + ghost + pieza actual)
     └─ requestAnimationFrame(loop)

   keydown → mover / rotar / soft-drop / hard-drop / pausa
```

Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), se dispara `endGame()` y se muestra el overlay de **Game Over**.

---

## Tecnologías

- **HTML5** — marcado y dos elementos `<canvas>` (tablero y vista previa).
- **CSS3** — _flexbox_, variables de color, `backdrop-filter` y `box-shadow`.
- **JavaScript (ES6+) vanilla** — `const`/`let`, _arrow functions_, _spread operator_, `Array.from`, _template literals_…
- **Canvas 2D API** — para todo el renderizado del juego.
- **`requestAnimationFrame`** — para el bucle de juego sincronizado con el navegador.

**Sin dependencias.** No hay `package.json`, ni bundler, ni transpilador.

---

## Estructura del proyecto

```
03-tetris/
├── index.html      # Estructura del DOM y canvas
├── style.css       # Estilos del juego (dark theme)
├── game.js         # Toda la lógica del Tetris (~300 líneas)
└── README.md
```

---

## Personalización

Algunos parámetros fáciles de tunear en `game.js`:

| Constante      | Significado                              | Por defecto           |
| -------------- | ---------------------------------------- | --------------------- |
| `COLS`         | Columnas del tablero                     | `10`                  |
| `ROWS`         | Filas del tablero                        | `20`                  |
| `BLOCK`        | Tamaño en píxeles de cada celda          | `30`                  |
| `COLORS`       | Paleta de colores por tipo de pieza      | 7 colores             |
| `LINE_SCORES`  | Puntos por 1, 2, 3 o 4 líneas eliminadas | `[0,100,300,500,800]` |
| `dropInterval` | Velocidad inicial de caída en ms         | `1000`                |
| `BOMB_RADIUS`  | Radio de la explosión (1 = área 3×3)     | `1`                   |
| `BOMB_BLOCK_SCORE` | Puntos por bloque destruido por la bomba | `50`              |
| `HOLLOW_CHANCE` | Probabilidad de pieza hueca en desafío  | `0.08`                |
| `CHALLENGE_ROWS` | Filas pre-colocadas en modo desafío    | `6`                   |
| `CHARGE_PER_USE` | Líneas necesarias por uso de habilidad | `4`                   |
| `MAX_USES`     | Usos de habilidad acumulables            | `3`                   |

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
