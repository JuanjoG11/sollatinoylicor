# MANUAL DE USUARIO
## Sistema POS - Sol Latino & Licores San Pedro

---

## COMO INICIAR EL SISTEMA

1. Abre la carpeta del sistema
2. Haz doble clic en **iniciar.bat**
3. Se abre una ventana negra (el servidor) y el navegador automaticamente
4. Para cerrar el sistema: cierra la ventana negra

> IMPORTANTE: Siempre usa iniciar.bat, no abras index.html directamente. Si lo abres directo, Supabase no conecta.

---

## NAVEGACION GENERAL

El menu lateral izquierdo tiene todas las secciones.
En la parte superior del sidebar puedes cambiar entre las dos empresas:

- SOL LATINO - tienda de alimentacion y bebidas
- SAN PEDRO - licores, rumba y snacks

Cada empresa tiene sus propios productos, ventas y facturas. Los datos se guardan en la nube (Supabase) y se sincronizan en tiempo real.

El punto verde en la barra superior indica que la conexion a internet esta activa. Si se pone rojo, revisar conexion.

---

## 1. PUNTO DE VENTA (Cobrar a un cliente)

Esta es la pantalla principal para hacer ventas.

### Paso a paso para cobrar:

**1. Seleccionar empresa**
Arriba en el sidebar pulsa "Sol Latino" o "San Pedro" segun donde estes vendiendo.

**2. Buscar el producto**
Tienes tres formas:
- Escribir el nombre en la barra de busqueda
- Escanear el codigo de barras con el lector (conecta el lector y escanea, presiona Enter)
- Pulsar el icono de camara para escanear con la camara del dispositivo
- Filtrar por categoria: Bebidas, Snacks, Licores, Comida, Otros

**3. Agregar al carrito**
Pulsa la tarjeta del producto. Se agrega automaticamente al carrito de la derecha.
Para cambiar cantidad: usa los botones + y - en el carrito.
Para quitar un producto: pulsa la X a la derecha.

**4. Opciones adicionales (opcionales)**
- Seleccionar cliente: desplegable arriba del carrito
- Campo Vendedor: escribe tu nombre (queda registrado en la venta)
- Campo Nota: cualquier anotacion sobre la venta
- Descuento %: escribe el porcentaje a descontar
- Foto: adjunta foto de la mercancia (util para entregas a credito)

**5. Elegir metodo de pago**
- EFECTIVO: muestra campo para ingresar el dinero recibido y calcula el cambio automaticamente
- TARJETA: registra pago con tarjeta
- BIZUM: registra pago por Bizum
- CREDITO: el cliente se lleva la mercancia y queda debiendo (ver seccion Credito)

**6. Cobrar**
Pulsa el boton naranja COBRAR.
Se genera automaticamente la factura con numero correlativo por empresa (SL-2024-0001 o SP-2024-0001).

**7. Factura**
Aparece la factura en pantalla con dos opciones:
- Imprimir: abre el dialogo de impresion del navegador
- Descargar PDF: guarda la factura en PDF en tu ordenador

---

## 2. DASHBOARD (Resumen del negocio)

Muestra el estado del negocio en tiempo real.

### Que ves aqui:

**KPIs superiores:**
- Ventas hoy: total en euros de las ventas del dia
- Ventas del mes: total acumulado del mes actual
- Productos: cuantos productos hay y cuantos con stock bajo
- Clientes: total de clientes registrados

**Graficas:**
- Ventas ultimos 7 dias: barras por dia
- Top productos: los mas vendidos en unidades
- Metodos de pago: dona con distribucion de efectivo/tarjeta/bizum/credito
- Por empresa: comparativa Sol Latino vs San Pedro

**Alertas de stock:** lista de productos sin stock, con stock bajo, proximos a vencer o con deuda vencida. Se actualiza automaticamente.

**Ultimas ventas:** las 8 ventas mas recientes con hora, empresa y monto.

**Filtros:** los botones "Ambas / Sol Latino / San Pedro" filtran todas las graficas a la vez.

---

## 3. PRODUCTOS E INVENTARIO

Una sola seccion con dos pestanas:

### Pestana CATALOGO

Lista completa de productos con:
- Codigo de barras
- Nombre, categoria, empresa
- Precio de venta, precio de costo, margen de ganancia (%)
- Stock actual y minimo
- Fecha de vencimiento (si se configuro)
- Estado: Optimo / Stock bajo / Sin stock

**Crear producto nuevo:**
1. Pulsa "+ Nuevo producto"
2. Rellena los campos:
   - Empresa: Sol Latino o San Pedro
   - Codigo de barras: escribe, escanea, o pulsa el dado para generarlo automatico
   - Nombre, categoria, precio de venta
   - Precio de costo (para calcular margen)
   - Stock inicial y stock minimo (cuando llegar al minimo dispara alerta)
   - Fecha de vencimiento y dias de alerta previos (ej: 7 dias antes avisa)
   - Lote (numero de lote o referencia del proveedor)
   - Emoji: elige un icono para reconocer el producto rapidamente en el POS
3. Pulsa Guardar

**Editar producto:** boton Editar en la fila
**Ajustar stock:** boton Stock en la fila (abre el modal de ajuste)
**Eliminar:** boton Borrar en la fila

### Pestana INVENTARIO Y STOCK

Vista enfocada en el control de existencias.

**Tarjetas resumen:**
- Verde: productos con stock optimo
- Amarillo: productos con stock bajo
- Rojo: productos sin stock
- Azul: valor total del inventario en euros (stock x precio costo)

**Filtro por estado:**
- Todos / Optimo / Stock bajo / Sin stock / Por vencer

**Ajuste de stock:**
Pulsa el boton "+ Ajuste de stock" o el boton "Ajustar" en cualquier fila.
- Entrada (+): cuando recibes mercancia del proveedor
- Salida (-): cuando sacas mercancia sin venta (uso interno, merma, etc.)
- Ajuste directo: corriges el stock al numero exacto que tienes fisicamente

Siempre escribe el motivo del ajuste para tener trazabilidad.

---

## 4. VENTAS (Historial)

Registro completo de todas las ventas realizadas.

**Filtros disponibles:**
- Rango de fechas (desde / hasta)
- Empresa: Sol Latino / San Pedro
- Metodo de pago: todos / efectivo / tarjeta / bizum / credito

**Columnas:**
Numero de factura, fecha, empresa, cliente, vendedor, productos, metodo y total.

**Ver factura:** boton Ver en cada fila - abre la factura y puedes reimprimir o descargar PDF.

**Exportar CSV:** boton en la parte superior - descarga todas las ventas del filtro actual en formato Excel.

**Cierre de caja:**
Boton "Cierre de Caja" en la parte superior.
Muestra el resumen del dia actual:
- Total por metodo de pago (efectivo, tarjeta, bizum, credito)
- Totales por empresa (Sol Latino / San Pedro)
- Total general del dia
Puedes imprimirlo para cuadrar la caja al final del turno.

---

## 5. CLIENTES

Registro de clientes habituales.

**Crear cliente:**
1. Pulsa "+ Nuevo"
2. Rellena nombre (obligatorio), email, telefono, NIF y direccion
3. Guardar

**Desde el POS:** al seleccionar un cliente en el desplegable del carrito, la venta queda asociada a ese cliente.

**Historial de compras:**
Boton "Historial" en cada fila del cliente.
Muestra:
- Total gastado en euros
- Numero de ventas realizadas
- Deuda pendiente actual
- Metodo de pago favorito
- Lista completa de todas sus compras con fecha, productos y total
- Lista de creditos/deudas activos

Boton "Descargar PDF" genera un informe completo del cliente.

---

## 6. CREDITO Y DEUDAS (Ventas a fiado)

Para clientes que se llevan mercancia y pagan despues.

### Como registrar una venta a credito:

1. Ve al Punto de Venta
2. Agrega los productos al carrito
3. Selecciona el cliente (muy importante para hacer seguimiento)
4. Escribe el vendedor en el campo correspondiente
5. Pulsa el boton "Foto" y fotografía la mercancia que se lleva el cliente
6. Selecciona el metodo de pago "CREDITO"
7. Pulsa COBRAR

El sistema registra:
- La venta con pago 0 euros
- La deuda automaticamente en la seccion Credito
- La foto de la mercancia vinculada a esa deuda

### Ver y gestionar deudas:

La seccion "Credito y Deudas" muestra:
- KPIs: total en deuda, deudas activas, clientes con deuda, cobrado hoy
- Tabla con todas las deudas y su estado: Pendiente / Parcial / Pagado

**Registrar un pago:**
1. Encuentra la deuda del cliente
2. Pulsa "Cobrar"
3. Ingresa el monto que paga (puede ser parcial)
4. Selecciona el metodo de pago
5. Adjunta la imagen del comprobante si paga por transferencia/bizum
6. Escribe una nota si es necesario
7. Pulsa "Registrar Pago"

La deuda se actualiza automaticamente:
- Si paga todo: estado cambia a "Pagado"
- Si paga parte: estado cambia a "Parcial" y queda el saldo restante

**Ver detalle de una deuda:**
Boton "Ver" - muestra todos los datos, foto de la mercancia e historial de pagos.

**Imprimir factura de credito:**
Boton "Imprimir" - genera documento con la lista de productos, el monto total, cuanto ha pagado y cuanto DEBE, con espacio para firma del cliente.

---

## 7. DEVOLUCIONES

Para cuando un cliente devuelve un producto.

### Como registrar una devolucion:

1. Pulsa "+ Nueva devolucion"
2. Selecciona la empresa
3. Tipo:
   - Devolucion: el cliente devuelve y recupera su dinero
   - Cambio: el cliente devuelve y lleva otro producto
   - Nota de credito: queda como credito para futuras compras
4. Numero de factura original (opcional, para vincular a la venta)
5. Selecciona el cliente
6. Agrega los productos devueltos con cantidad y precio
7. Metodo de devolucion: como le devuelves el dinero
8. Escribe el motivo
9. Registrar Devolucion

El stock se repone automaticamente cuando el tipo es "Devolucion" o "Cambio".

Se genera un documento imprimible con la nota de devolucion y espacio para firma.

---

## 8. SOPORTES DE PAGO

Registro de comprobantes de transferencias, bizum y pagos electronicos.

### Los soportes se crean automaticamente cuando:
- Haces una venta con Bizum o Tarjeta y adjuntas foto desde el POS
- Registras un pago de deuda y adjuntas la imagen del comprobante

### Subir soporte manualmente:
1. Pulsa "+ Subir soporte"
2. Selecciona el tipo: Transferencia, Venta, Pago de deuda, Otro
3. Escribe la referencia (numero de factura o referencia libre)
4. Nombre del cliente y monto
5. Sube la imagen del comprobante (foto, captura de pantalla)
6. Guardar

### Que puedes hacer con cada soporte:
- **Ver**: muestra la imagen del comprobante en grande
- **PDF**: descarga un PDF con todos los datos del pago y la imagen
- **Compartir**: envia el soporte por WhatsApp o email (en movil) o descarga la imagen directamente
- **Borrar**: elimina el soporte

---

## 9. CONFIGURACION

### Cambiar empresa activa:
Selector "Empresa seleccionada" - cambia la empresa predeterminada del sistema.

### Pie de factura:
Personaliza el texto que aparece al final de cada factura por empresa.
Pulsa "Guardar" despues de modificar.

### Exportar datos:
Descarga un backup completo en formato JSON con todos los datos: productos, ventas, clientes, deudas y soportes.
Recomendado hacerlo periodicamente como copia de seguridad adicional.

### Cargar datos de demostracion:
Solo para pruebas. Carga productos y ventas de ejemplo para explorar el sistema.

### Borrar todos los datos:
Elimina todo de la base de datos. IRREVERSIBLE. Usa solo si necesitas empezar desde cero.

---

## ALERTAS AUTOMATICAS

El sistema genera alertas visibles en el Dashboard en tres niveles:

**Rojo (critico):**
- Producto sin stock
- Producto con fecha de vencimiento ya pasada
- Deuda con mas de 30 dias sin ningún pago

**Amarillo (advertencia):**
- Producto con stock igual o por debajo del minimo configurado
- Producto que vence dentro de los proximos X dias (configurable por producto)
- Deuda que lleva mas del 80% del tiempo limite sin pagar

---

## FACTURAS Y DOCUMENTOS

Todos los documentos del sistema incluyen:
- Logo y nombre de la empresa (Sol Latino o San Pedro)
- Numero de factura correlativo y unico por empresa
- Fecha y hora
- Nombre del cliente y vendedor
- Lista detallada de productos con cantidades y precios
- Subtotal, descuento si aplica, IVA 21% y total

**Tipos de documentos que genera el sistema:**
1. Factura de venta (normal)
2. Factura de credito / fiado (con seccion DEBE y foto de mercancia)
3. Nota de devolucion
4. Comprobante de soporte de pago
5. Historial de cliente (PDF)
6. Cierre de caja (imprimible)

Todos los PDF se pueden descargar o imprimir directamente desde el sistema.

---

## PREGUNTAS FRECUENTES

**El sistema no conecta / punto rojo arriba:**
Revisar conexion a internet. Supabase requiere internet para funcionar.

**El producto no aparece al escanear:**
El codigo de barras no esta registrado. Ve a Productos, busca el producto y verifica o corrige su codigo.

**Veo un producto pero dice "Sin stock":**
El stock llego a cero. Ve a Inventario, busca el producto y haz un ajuste de stock tipo "Entrada".

**Quiero cambiar el precio de un producto:**
Ve a Productos, pulsa "Editar" en el producto y modifica el precio. Los cambios aplican a partir de ese momento, las ventas anteriores mantienen el precio original.

**El cliente pago menos de lo que debe:**
Ve a Credito y Deudas, pulsa "Cobrar" en la deuda correspondiente e ingresa el monto parcial. El saldo restante queda pendiente.

**Cometi un error en una venta:**
Registra una devolucion del mismo importe desde la seccion Devoluciones.

**Como saber cuanto dinero entre hoy:**
Ve a Ventas y pulsa "Cierre de Caja". Muestra el desglose exacto por metodo de pago.

**El sistema va lento:**
Asegúrate de usar iniciar.bat y no abrir index.html directamente. Si sigue lento, cierra otras pestanas del navegador.

---

## DATOS TECNICOS

- Base de datos: Supabase (nube)
- Los datos se guardan automaticamente en cada accion
- Funciona en Chrome, Edge y Firefox (recomendado Chrome o Edge)
- Compatible con tablets y moviles para uso en mostrador
- Para usar en movil: abre http://[IP-del-ordenador]:3000 desde el movil conectado a la misma red WiFi

---

*Sistema POS - Sol Latino & Licores San Pedro*
*Dos empresas, una sola herramienta*
