# Calculadora de amaestramiento

Herramienta web de SBC Grupo Sebalcab para calcular amaestramientos de cilindros de cualquier marca.

- Se configura el cilindro: posiciones, alturas, pastillas (cuántas alturas sube cada una) y, si se tienen, las profundidades de la ficha.
- Se escribe la llave maestra y el plan de cierre: cilindros, llaves, copias y qué abre cada llave.
- La calculadora propone el código de tallado de cada llave, el montaje de pitones y pastillas por cámara, comprueba que ninguna llave abre de más y saca el material necesario.
- «Guardar plan» descarga un documento HTML maquetado que se imprime o se guarda en PDF y que se vuelve a abrir con «Abrir plan».

Archivos:

- `assets/motor.js`: cálculo (se puede probar con Node, `require('./assets/motor.js')`).
- `assets/app.js`: interfaz, plantillas de cilindro y documento del plan.
- `assets/estilos.css`: imagen negro y oro de Sebalcab, modo claro y oscuro, hoja de taller impresa.

Plantillas incluidas: genérico de 6 pitones y Securemme K1 (ficha Silca: 268, 223, 178, 133, 88, 43; pastillas de 0,90 mm = 2 alturas y 1,80 mm = 4 alturas). Solo se añaden plantillas con datos comprobados en su ficha.

El cálculo es teórico: cada cilindro se prueba con todas sus llaves antes de entregarlo. Los planes se guardan en el navegador de cada usuario; no se envían a ningún servidor.
