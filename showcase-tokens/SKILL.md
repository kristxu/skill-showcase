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
   - **No inventes valores.** Si no hay variables o falta información, pregunta antes.
3. **Trabajar siempre en una página nueva** (por ejemplo "Color · Showcase"). Comprueba que no exista ya una con ese nombre y no toques las páginas existentes.

## 2. Variables de maquetación

Crea (o reutiliza si ya existe) una colección **"Showcase · Layout"**, modo "Value", con al menos:

| Variable | Valor por defecto | Scope |
|---|---|---|
| radius/swatch | 10 | CORNER_RADIUS |
| radius/card | 16 | CORNER_RADIUS |
| radius/chip | 8 | CORNER_RADIUS |
| radius/badge | 999 | CORNER_RADIUS |

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
- **Espaciado:** `Spacing / Muestra` (barra cuyo ancho se enlaza a la variable + nombre + valor en px).
- **Radios:** `Radius / Muestra` (cuadrado con el radio enlazado a la variable + nombre + valor).

## 4. El showcase (solo instancias)

Un marco raíz de 1440 px de ancho, con auto layout vertical, padding 80, fondo enlazado a una variable, y:

1. **Cabecera:** nombre del sistema, título y resumen de qué colecciones, modos y cuántas variables hay. Indica que las muestras son instancias de "_Componentes".
2. **Secciones según el token.** Cada muestra es una instancia: rellena sus propiedades de texto y sobrescribe el color de la capa correspondiente con su variable.
   - **Color:**
     - **Primitivos** agrupados por familia. Marca "Sin uso" los que ningún semántico referencia.
     - **Semánticos** en dos paneles lado a lado, uno por modo (`setExplicitVariableModeForCollection`), agrupados por categoría (Background, Text, Border, Action, Focus, Status…). Cada panel termina con un pequeño **ejemplo de uso** pintado solo con semánticos.
     - **Accesibilidad** (obligatoria, ver sección 5).
   - **Tipografía:** escala de estilos de mayor a menor.
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
2. **Prueba de radio:** cambia temporalmente `radius/swatch` (por ejemplo a 24), comprueba que una instancia lo refleja y devuélvelo a su valor.
3. Comprueba que no quedan capas temporales ni marcos sueltos donde debería haber instancias.
4. Resume al usuario: página creada, componentes y sus propiedades, número de instancias, variables nuevas y hallazgos de accesibilidad. Aclara que los ratios son texto fijo: si cambian las variables, hay que recalcularlos.

## Qué NO hacer

- No montar muestras con marcos sueltos ni duplicar tarjetas a mano.
- No escribir colores a mano: todo va enlazado a variables.
- No modificar páginas existentes ni las variables originales del sistema.
- No añadir un bloque explicativo de "por qué componentes e instancias" salvo que se pida.
