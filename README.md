# Oye Toulouse — app

Agenda cultural de la diáspora latinoamericana en Toulouse. App web instalable (PWA), sin servidor: el contenido vive en un Google Sheet.

## Qué hay en la app

| Pestaña | Qué muestra |
|---|---|
| **Hoy** | Bloque *En vivo ahora* (lo que está pasando en este momento, con barra de tiempo), luego *Más tarde hoy* y *Mañana*. |
| **Agenda** | Los próximos 31 días, agrupados por día. Buscador, filtros (Este finde, Gratis, Me apunto, por tipo) y tira de días para saltar. |
| **+** | Formulario para que la gente mande su evento. |
| **Lugares** | Directorio de bares, tiendas, cafés y asociaciones latinas. |
| **Oye** | Emisiones (próxima emisión + episodios con link a YouTube/Spotify), quiénes somos, cómo instalar la app. |
| **Story** (botón rosa en Agenda) | Genera la imagen 1080×1920 de *Este finde*, *Hoy* o *7 días*, en español, francés o bilingüe, lista para la story. |

La app está en **español y francés** (botón ES/FR arriba a la derecha; arranca en francés si el teléfono está en francés). Si un evento tiene `titulo_fr` o `descripcion_fr`, se muestran en la versión francesa; si no, se muestra el texto original.

Cada evento abre una ficha con: cuándo, **dónde** (link a Google Maps + Instagram del lugar), **organiza** (Instagram del colectivo, aparte del lugar), precio, cuentas etiquetadas, descripción, flyer, y botones *Me apunto*, *Calendario* (.ics) y *Compartir* (WhatsApp/Instagram).

## Archivos

```
index.html  styles.css  app.js  config.js   ← la app
i18n.js                                     ← todos los textos ES / FR
story.js                                    ← generador de stories
manifest.json  sw.js                        ← instalable y funciona sin conexión
img/                                        ← logos e íconos
data/*.json                                 ← datos de EJEMPLO (inventados)
google-apps-script/Code.gs                  ← el "backend" en Google Sheets
```

## Publicar (igual que el FBAL)

1. Sube todo a un repo nuevo de GitHub (ej. `oye-toulouse`).
2. En Vercel → *Add New Project* → importa el repo → *Deploy*. No hay que configurar nada (es un sitio estático).
3. Mientras `DEMO_MODE: true` en `config.js`, la app muestra los eventos de ejemplo movidos a la fecha de hoy.

## Conectar Google Sheets (formulario + agenda)

1. Crea un Google Sheet vacío llamado **Oye Toulouse – Agenda** (con la cuenta del medio).
2. Menú **Extensiones → Apps Script**. Borra lo que haya y pega todo `google-apps-script/Code.gs`. Si quieres un email por cada evento recibido, escribe tu correo en `EMAIL_AVISO`. Guarda.
3. Arriba, elige la función **setup** y dale **Ejecutar**. Acepta los permisos (Sheets, Drive para los flyers, Gmail para el aviso). Se crean 4 pestañas: **Propuestas**, **Agenda**, **Lugares**, **Emisiones**.
4. **Implementar → Nueva implementación → tipo «Aplicación web»**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   - Copia la URL que termina en `/exec`.
5. En `config.js`: pega esa URL en `API_URL` y pon `DEMO_MODE: false`. Sube el cambio a GitHub → Vercel se actualiza solo.

> Si después cambias el código del script, usa **Implementar → Gestionar implementaciones → editar → Nueva versión**, así la URL no cambia.

## El flujo de cada semana

```
Gente llena el formulario ──► pestaña PROPUESTAS (estado: pendiente)
                                    │  revisan, corrigen si hace falta
                                    ▼
             menú «Oye Toulouse → Publicar las propuestas seleccionadas»
                                    ▼
                         pestaña AGENDA (estado: publicado) ──► la app
```

- **Lo que ustedes encuentren** (Instagram, carteles, etc.): escríbanlo directo en la pestaña **Agenda** con `estado = publicado`.
- **Para quitar un evento**: cambia su estado a `cancelado` o `borrador`.
- La app se actualiza sola (lee el Sheet al abrirse y cada 10 min). No hay que mandarle nada a nadie ni volver a subir la app.
- El email/WhatsApp de quien manda el evento queda solo en **Propuestas**, nunca se publica.

### Columnas de la Agenda

| Columna | Formato | Ejemplo |
|---|---|---|
| estado | publicado / borrador / cancelado | publicado |
| titulo | texto | Noche de cumbia |
| categoria | Música, Fiesta, Baile, Cine, Arte, Charla, Taller, Gastronomía, Comunidad, Infancia, Deporte, Otro | Fiesta |
| fecha | 2026-10-10 o 10/10/2026 | 10/10/2026 |
| fecha_fin | solo si dura varios días | 24/10/2026 |
| hora_inicio / hora_fin | 22:00 | 22:00 / 03:00 (si termina después de medianoche, la app lo entiende) |
| lugar, direccion, ciudad | texto | Bar La Candela · Rue Gramat · Toulouse |
| ig_lugar, ig_organizador | con o sin @ | lacandela.bar |
| organizador | texto | Colectivo Sonidero Rosa |
| ig_etiquetas | varias, separadas por espacio | @dj.mariposa @otra |
| precio | Gratis / Prix libre / 8 € | 8 € |
| descripcion | texto | … |
| link | https://… (entradas o info) | |
| imagen | URL del flyer (el formulario la llena solo) | |

Si un evento se repite cada semana (clase de salsa), copia la fila y cambia la fecha.

## Lugares

Pestaña **Lugares**: `estado, nombre, tipo, barrio, direccion, descripcion, instagram, link`. Tipos sugeridos: Restaurante, Bar, Café, Tienda, Baile, Asociación.

## Emisiones

Pestaña **Emisiones**: `estado, numero, titulo, titulo_fr, fecha, hora_inicio, hora_fin, lugar, direccion, invitades, descripcion, descripcion_fr, vodio, instagram, imagen`.

- Si una emisión tiene fecha y hora, aparece sola en la agenda y en el bloque **En vivo** del inicio mientras está al aire.
- En `vodio` pega el **código de inserción** del episodio (el `<iframe…>` que da Vodio en «Intégrer») para que se escuche dentro de la app. Si pegas solo el link del episodio, sale un botón «Abrir en Vodio». Un link directo a un .mp3 también se reproduce en la app.

## Story de la semana

Agenda → botón **Story**. Elige *Este finde / Hoy / 7 días* y el idioma. Si hay muchos eventos, salen varias imágenes (1/2, 2/2…). En el celular, **Compartir** abre directamente Instagram; en la compu, **Descargar**. Pon la dirección de la app en `APP_URL` (config.js) para que salga al pie.
