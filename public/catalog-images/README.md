# Ilustraciones originales de Hilvana

Generadas con la herramienta `image_gen` de OpenAI el 30-10-2026 para este proyecto. Son ilustraciones de producto, no fotografías de prototipos confeccionados. La app las identifica como IA en cada ficha de diseño.

Estilo compartido: producto textil completo, fondo marfil, iluminación suave de estudio, textura de tela, perspectiva frontal o ligera vista superior según el objeto; sin marcas, nombres ni rótulos. Prendas sin accesorios opcionales que el patrón no incluya. Fundas y tapetes pueden incluir objetos de referencia para explicar su uso.

Cada archivo contiene nueve posiciones; la correspondencia está en `src/data/catalogImages.ts`. Las posiciones no utilizadas por diseños contienen variantes o una muestra de material. No se exponen como diseños adicionales.

Originales PNG conservados en `/workspace/generated_images/` durante la sesión:

| Archivo servido | Original final |
| --- | --- |
| prendas-01.webp | exec-0acfb9b4-771a-44df-b840-154255c41fc9.png |
| prendas-02.webp | exec-512887cd-2508-4afc-900d-e4174602db23.png |
| prendas-03.webp | exec-150a1e9a-4b43-4f46-8d50-b1af91f32f62.png |
| accesorios-01.webp | exec-fbff6541-7429-4432-8105-ac1309f1fd02.png |
| fundas-01.webp | exec-a35a99fd-9a3a-454a-87a0-50adc6921a0f.png |
| fundas-02.webp | exec-e57f221e-d153-4c00-a040-b441541731d5.png |
| hogar-01.webp | exec-416ceb87-732d-410f-b9ad-fadbcc55f4bd.png |
| especiales-01.webp | exec-0e0d92e0-c0aa-45a3-ae22-adc729c94853.png |
| disfraces-01.webp | exec-61f34b48-a027-45d6-ba9e-12578d26f378.png |
| disfraces-02.webp | exec-e5d2622e-12ee-4f38-89ab-cbf4d5a5c1a9.png |
| disfraces-03.webp | exec-189ddd88-e201-4b94-8f21-baa966850311.png |
| disfraces-04.webp | exec-9f600872-fd86-47ea-84e5-569301156e2c.png |
| disfraces-05.webp | exec-b2bf201c-15d2-41fb-b665-695fd8a5a6dd.png |

Conversión de formato: `ffmpeg -i ORIGINAL.png -c:v libwebp -quality 86 -compression_level 6 DESTINO.webp`.
No necesita una API, credenciales ni red para mostrar estas imágenes instaladas.
