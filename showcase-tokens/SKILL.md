---
name: showcase-tokens
description: Monta en Figma un showcase (página de consulta) de los tokens de un sistema de diseño (color, tipografía, espaciado o radios) usando SIEMPRE componentes reutilizables en una sección "_Componentes" y construyendo todas las muestras como instancias enlazadas a variables. Úsala siempre que se pida un showcase, specimen, página de documentación o "página para consultar" variables, tokens, foundations, colores, tipografía, espaciados o radios en Figma, aunque no se mencionen componentes ni instancias. En los showcases de color incluye siempre una sección de accesibilidad con el contraste WCAG.
---

# Showcase de tokens con componentes e instancias

Objetivo: una página de Figma para consultar los tokens de un sistema, que además funcione como un pequeño sistema. Si se cambia un componente o una variable, todo el showcase se actualiza.

**Regla principal:** nada de marcos sueltos para las muestras. Primero se crean los componentes base y después el showcase se monta **solo con instancias**.

## 1. Antes de empezar

1. **Elegir herramienta:**
   - Si el archivo tiene el plugin **Desktop Bridge** abierto (compruébalo con `figma_list_open_files` de Figma Console), usa **Figma Console** (`figma_execute`).
   - Si no, o si hay que **crear un archivo nuevo**, usa el **conector oficial de Figma** (`create_new_file`, `use_figma`) y carga antes sus skills obligatorias (`figma-use`, y `figma-create-new-file` si creas archivo).
   - Ojo: en Figma Console no existen los atajos del conector oficial (`figma.createAutoLayout`, `node.set`, `node.screenshot`). Escribe tus propios helpers con `figma.createFrame()` + `layoutMode`, y verifica con `figma_capture_screenshot`.
2. **Leer las variables del archivo** (colecciones, modos, nombres, valores y alias) antes de crear nada.
   - Si los tokens están en otro archivo, léelos de allí. Si hay que trabajar en un archivo nuevo, copia las colecciones con los mismos nombres, modos, alias, scopes y code syntax (`var(--…)`).
   - **Scopes al copiar:** copia los tokens del sistema **tal cual**, aunque tengan `ALL_SCOPES`. Una copia es un reflejo fiel del original, no una corrección. Si tienen `ALL_SCOPES`, **señálalo como hallazgo** en la cabecera del showcase y en el resumen final, y propón el scope adecuado (`GAP` para espaciado, `CORNER_RADIUS` para radios, `FONT_SIZE` para tamaños de fuente). La regla "nunca `ALL_SCOPES`" se aplica solo a las variables que crea la skill (sección 2).
   - **No inventes valores.** Si no hay variables o falta información, pregunta antes.
   - **Tipografía sin estilos de texto:** lee también `getLocalTextStylesAsync()`. Si solo hay variables de tamaño (sin estilos ni variables de familia, peso, interlineado o tracking), monta igualmente la escala de tamaños, **avisa en la página** de qué no está tokenizado y con qué fuente neutra se muestran los ejemplos (por ejemplo "Inter Regular"), y **no crees estilos de texto** ni inventes esos valores. Inclúyelo en el resumen final como hallazgo.
3. **Trabajar siempre en una página nueva** (por ejemplo "Color · Showcase"). Comprueba que no exista ya una con ese nombre y no toques las páginas existentes.

## 2. Variables de maquetación

Crea (o reutiliza si ya existe) una colección **"Showcase · Layout"**, modo "Value", con al menos:

| Variable | Valor por defecto | Scope |
|---|---|---|
| radius/swatch | 10 | CORNER_RADIUS |
| radius/card | 16 | CORNER_RADIUS |
| radius/chip | 8 | CORNER_RADIUS |
| radius/badge | 999 | CORNER_RADIUS |
| radius/row | 12 | CORNER_RADIUS |

Uso: `radius/swatch` en muestras de color, `radius/card` en tarjetas y paneles, `radius/chip` en etiquetas, `radius/badge` en badges y `radius/row` en las filas de muestra de tipografía y espaciado (`Type / Muestra`, `Spacing / Muestra`). Crea todas las variables de la tabla aunque el showcase no use alguna.

Enlaza los radios de componentes y tarjetas a estas variables (las cuatro esquinas: `topLeftRadius`, `topRightRadius`, `bottomLeftRadius`, `bottomRightRadius`). Nunca dejes variables con `ALL_SCOPES`.

## 3. Sección "_Componentes"

Crea una **Section** llamada `_Componentes` a la derecha del showcase, separada de él. Dentro, los componentes base que necesite el tipo de token. Cada uno lleva:

- **Propiedades de texto** (`addComponentProperty(…, 'TEXT', …)`) para todo texto que cambie entre muestras (nombre, valor, alias, ratio…), con un valor por defecto realista, nunca vacío.
- **Propiedades booleanas** para elementos opcionales (por ejemplo "Sin uso").
- **Variantes** solo cuando cambia la estructura (por ejemplo Tipo = Texto / No textual, o Nivel = AAA / AA / …).
- **Instancias anidadas expuestas** (`isExposedInstance = true`) para badges dentro de filas.
- **Descripción** (`description`) explicando para qué sirve y qué capa sobrescribir.
- Colores, bordes y textos **enlazados a variables**. Ningún color escrito a mano.

Componentes de referencia por tipo de token:

- **Color:** `Swatch / Primitivo` (muestra + nombre + hex + "Sin uso"), `Swatch / Semántico` (muestra + nombre + "→ primitivo · hex"), `Badge / Contraste` (variantes AAA, AA, Texto grande, Pasa 3:1, Falla), `Criterio`, `Contraste / Semántico` (Tipo = Texto | No textual), `Contraste / Primitivo` (fila de tabla).
- **Tipografía:** `Type / Muestra` (texto de ejemplo con el estilo aplicado + nombre + familia, peso, tamaño, interlineado, tracking).
- **Espaciado:** `Spacing / Muestra` (barra cuyo ancho sale de la variable + nombre + valor en px). Ver "Barra de espaciado" más abajo.
- **Radios:** `Radius / Muestra` (cuadrado con el radio enlazado a la variable + nombre + valor).

### Barra de espaciado (no enlazar `width`)

Si el **ancho** de un rectángulo se enlaza a una variable en el componente principal, las instancias **no aceptan otro valor** (ni otra variable ni `resize`): todas las barras salen con el valor del principal. Monta la barra así:

1. "Barra" es un **marco** con auto layout horizontal, ancho `AUTO` (hug), alto fijo (24) y relleno enlazado a un color de texto (contraste ≥ 3:1 con el fondo de la tarjeta).
2. Dentro, una capa "Ancla (0 px)" de 0,01 × 24 sin relleno. Sin hijos, un marco vacío no baja del tamaño que tenía y los valores pequeños (0, 4, 8, 12) salen todos iguales.
3. Enlaza **`paddingLeft`** de "Barra" a la variable de espaciado: el ancho de la barra = valor del token.
4. En cada instancia: `barra.setBoundVariable('paddingLeft', variable)`. Comprueba que los anchos coinciden con los valores.

```js
const bar = figma.createFrame(); track.appendChild(bar);
bar.name = 'Barra'; bar.layoutMode = 'HORIZONTAL';
bar.primaryAxisSizingMode = 'AUTO'; bar.counterAxisSizingMode = 'FIXED'; bar.resize(16, 24);
const anchor = figma.createRectangle(); bar.appendChild(anchor);
anchor.name = 'Ancla (0 px)'; anchor.resize(0.01, 24); anchor.fills = [];
bar.setBoundVariable('paddingLeft', spaceVar);
```

## 4. El showcase (solo instancias)

Un marco raíz de 1440 px de ancho, con auto layout vertical, padding 80, fondo enlazado a una variable, y:

1. **Cabecera:** nombre del sistema, título y resumen de qué colecciones, modos y cuántas variables hay. Indica que las muestras son instancias de "_Componentes".
2. **Secciones según el token.** Cada muestra es una instancia: rellena sus propiedades de texto y sobrescribe el color de la capa correspondiente con su variable.
   - **Color:**
     - **Primitivos** agrupados por familia. Marca "Sin uso" los que ningún semántico referencia.
     - **Semánticos** en dos paneles lado a lado, uno por modo (`setExplicitVariableModeForCollection`), agrupados por categoría (Background, Text, Border, Action, Focus, Status…). Cada panel termina con un pequeño **ejemplo de uso** pintado solo con semánticos.
     - **Accesibilidad** (obligatoria, ver sección 5).
   - **Tipografía:** escala de estilos (o de tamaños, si no hay estilos) de mayor a menor. Enlaza `fontSize` de la capa de ejemplo a la variable de cada token.
   - **Espaciado y radios:** escala ordenada de menor a mayor.
3. Iguala alturas de tarjetas en una misma fila (`layoutSizingVertical = 'FILL'` en los hijos).

### Fallo conocido: muestras negras

Si al sobrescribir el relleno de una instancia se usa **la misma variable que ya tiene el componente principal**, Figma mantiene el enlace pero deja el color de relleno provisional (negro). Para evitarlo, crea siempre la pintura con el **color real resuelto** además del enlace:

```js
const boundPaint = (variable, node) => {
  const { value } = variable.resolveForConsumer(node); // respeta el modo del nodo
  return [figma.variables.setBoundVariableForPaint(
    { type: 'SOLID', color: { r: value.r, g: value.g, b: value.b } }, 'color', variable)];
};
```

Úsalo en todas las asignaciones de `fills` y `strokes`, también en los componentes principales. Si el nodo aún no está en el árbol, añádelo primero y luego asigna la pintura.

## 5. Accesibilidad (obligatoria en showcases de color)

Calcula los ratios con la fórmula de WCAG 2.2 (luminancia relativa) sobre los valores reales resueltos en cada modo:

- **Criterios:** tarjetas (instancias de `Criterio`) con AAA 7:1, AA 4,5:1, texto grande 3:1 y no textual 3:1 (WCAG 1.4.11).
- **Resumen de hallazgos:** cuántos pares pasan y cuáles fallan, con el ratio exacto y **propuestas concretas** con su ratio resultante (por ejemplo "usar neutral/500 → 3,60:1"). **Solo documentar: no cambies variables** sin preguntar antes.
- **Tabla de primitivos:** cada color sobre blanco y sobre el tono más oscuro, con una muestra "Aa", el ratio, un badge y el color de texto recomendado encima.
- **Pares semánticos por modo:** texto sobre cada fondo, texto de acción sobre su fondo y hover, texto de estado sobre su fondo (mínimo 4,5:1), y bordes y anillo de foco sobre sus fondos (mínimo 3:1).
- Formato de ratios en español: `4,87 : 1`.
- Respeta también la skill `accesibilidad` si está disponible.

## 6. Verificación antes de terminar

1. **Captura** del showcase y de "_Componentes". Revisa que no haya muestras negras ni vacías, textos cortados, solapes ni tarjetas de distinta altura en una misma fila.
2. **Prueba de radio:** cambia temporalmente (por ejemplo a 24) una variable de "Showcase · Layout" **que el showcase use de verdad**: `radius/swatch` en color, `radius/row` en tipografía y espaciado. Comprueba que una instancia lo refleja y devuélvela a su valor. En espaciado, prueba también a cambiar un primitivo (por ejemplo `space/16`) y comprueba que la barra de su alias semántico cambia.
3. Comprueba que no quedan capas temporales ni marcos sueltos donde debería haber instancias.
4. Resume al usuario: página creada, componentes y sus propiedades, número de instancias, variables nuevas y hallazgos de accesibilidad. Aclara que los ratios son texto fijo: si cambian las variables, hay que recalcularlos.

## Qué NO hacer

- No montar muestras con marcos sueltos ni duplicar tarjetas a mano.
- No escribir colores a mano: todo va enlazado a variables.
- No modificar páginas existentes ni las variables originales del sistema.
- No añadir un bloque explicativo de "por qué componentes e instancias" salvo que se pida.
