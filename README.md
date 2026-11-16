# VAYOTECH IMPORT · Mi caja

Panel para registrar los gastos del emprendimiento y los gastos personales.

**Abrir:** [Panel en GitHub Pages](https://72008081-pixel.github.io/vayotech-mi-caja-web/)

La web pública muestra un formulario de acceso. La contraseña y los registros se validan y guardan en un servicio con base de datos privada; no forman parte de este repositorio. Cada movimiento se guarda al pulsar **Guardar**. Los borradores se sincronizan durante la edición y cada cinco minutos mientras el formulario permanezca abierto.

Para compilar: `npm ci && npm run build`. GitHub Pages publica la carpeta `docs/` de la rama `main`.
