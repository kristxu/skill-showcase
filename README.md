# skill-showcase

Skill de Claude Code que documenta en Figma los tokens de un sistema de diseño o del CSS de una web (color, tipografía, espaciado, radios y sombras) con componentes reutilizables e instancias enlazadas a variables. Antes de empezar pregunta qué tokens y qué nivel quieres: una paleta sencilla para consultar o un sistema completo con semánticos por modo y revisión de contraste WCAG.

## Qué incluye

- [`showcase-tokens/SKILL.md`](showcase-tokens/SKILL.md): la skill. Monta en Figma una página de consulta de los tokens con componentes base en una sección "_Componentes" y todas las muestras como instancias enlazadas a variables. Si cambias un componente o una variable, todo el showcase se actualiza.
- [`showcase-tokens/scripts/`](showcase-tokens/scripts/): los scripts para sacar los tokens de una web (`extraer-css-url.js` sin navegador, `extraer-css-web.js` con navegador) y calcular contrastes (`contraste.js`). La skill funciona sola: no necesita ninguna otra skill instalada.

## Dos niveles

Si no lo dices en la petición, la skill pregunta antes de generar nada:

- **Sencillo:** paleta o escala agrupada por uso (marca, estados, neutros, superficies, transparencias), con nombre, valor y uso de cada token. Rápido, para tener una referencia visual.
- **Completo:** primitivos y semánticos por modo, ejemplos de uso y, en color, una sección de accesibilidad con el contraste WCAG 2.2 de cada par y propuestas para los que fallan.

## De dónde saca los tokens

- **Un archivo de Figma** con variables: las lee tal cual, con sus modos, alias y scopes.
- **Una web** (pasándole la URL): descarga el HTML y todas sus hojas de estilo sin navegador y copia los valores como variables en un archivo nuevo. Detecta temas por clase y calcula los tamaños de letra fluidos a 1440 y 375 px. Si la web bloquea la descarga, te avisa y te propone qué hacer: usar el MCP de Playwright (recomendado), guardar tú la página o pasarle las hojas CSS.

## Cómo instalarla

1. Copia la carpeta `showcase-tokens` en tu carpeta de skills personales de Claude Code:
   - Windows: `C:\Users\<tu-usuario>\.claude\skills\`
   - macOS / Linux: `~/.claude/skills/`
2. Abre una sesión nueva de Claude Code.
3. Pide, por ejemplo: *"hazme un showcase de los colores de este archivo de Figma"* o *"hazme el showcase de colores y tipografía de https://…"*.

## Qué necesita

- Acceso a Figma mediante el conector oficial de Figma o Figma Console (con el plugin Desktop Bridge abierto en el archivo).
- Node 18 o posterior, solo para sacar los tokens de una web.
- MCP de Playwright: opcional, solo si una web bloquea la descarga y eliges usar un navegador.

## Skill relacionada

[skill-auditoria](https://github.com/kristxu/skill-auditoria) revisa si un sistema visual está bien (contraste, tokenización, duplicados, escalas) y entrega un informe. Son independientes: puedes instalar una, la otra o las dos.
