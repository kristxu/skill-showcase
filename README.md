# skill-showcase

Skill de Claude Code que genera en Figma la documentación de cualquier sistema de diseño (color, tipografía, espaciado y radios) con componentes reutilizables, instancias enlazadas a variables y revisión de accesibilidad WCAG integrada. Cada showcase sale bien estructurado, fácil de mantener y accesible desde el primer momento.

## Qué incluye

- [`showcase-tokens/SKILL.md`](showcase-tokens/SKILL.md): la skill. Monta en Figma un showcase de los tokens de un sistema de diseño (color, tipografía, espaciado o radios) con componentes reutilizables en una sección "_Componentes" y todas las muestras como instancias enlazadas a variables. En los showcases de color añade siempre una sección de accesibilidad con el contraste WCAG.

## Cómo instalarla

1. Copia la carpeta `showcase-tokens` en tu carpeta de skills personales de Claude Code:
   - Windows: `C:\Users\<tu-usuario>\.claude\skills\`
   - macOS / Linux: `~/.claude/skills/`
2. Abre una sesión nueva de Claude Code.
3. Pide, por ejemplo: *"hazme un showcase de los colores de este archivo de Figma"*.

Necesita acceso a Figma mediante el conector oficial de Figma o Figma Console (con el plugin Desktop Bridge abierto en el archivo).
