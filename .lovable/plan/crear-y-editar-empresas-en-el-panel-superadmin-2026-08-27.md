# Crear y editar empresas en el Panel SuperAdmin

## 1. Base de datos (script SQL para ejecutar en Supabase)

Se añaden tres columnas opcionales de texto a la tabla de empresas:

```sql
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS admin_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text;
```

Entregaré este script en el chat para que lo ejecutes en el editor SQL de tu Supabase. El formulario queda conectado a esas columnas.

## 2. Nueva Empresa (vista principal del panel)

- Botón primario "+ Nueva Empresa" (icono `Plus` de Lucide) en la cabecera, con el mismo sistema visual y padding del botón "Configurar pagos y tarifas", en azul principal.
- Abre un modal accesible (fondo oscurecido, tarjeta blanca `rounded-2xl`, borde `#E2E8F0`, cierre con Escape y clic fuera, foco inicial en el primer campo).
- Campos: Nombre del Lavadero*, Código de Empresa* (mayúsculas automáticas), Nombre del Administrador*, Correo de contacto*, Teléfono (opcional), Plan Inicial (Prueba / Mensual / Anual).
- Validación en cliente: campos obligatorios, formato de correo, código único (aviso si ya existe).
- Al guardar: se crea la empresa con estado "Activa" y fecha de cobro automática según plan (Prueba +7 días, Mensual +30, Anual +365). Se cierra el modal, se refresca la lista y aparece un Toast de éxito.

## 3. Editar Información (vista de detalle del lavadero)

- Botón secundario "Editar Información" (icono `Pencil`) junto al encabezado con nombre y código de la empresa, en el estilo suave azul/verde del panel.
- Abre un modal con: Nombre de la empresa, Correo de contacto, Teléfono. También se muestran el administrador y el código (solo lectura el código).
- Al guardar solo se actualizan esos campos; plan, estado y fechas de cobro quedan intactos.
- Toast de éxito y actualización inmediata en la vista de detalle y en la lista.

## Detalles técnicos

- `src/lib/types.ts`: `Business` gana `admin_name`, `email`, `phone` (`string | null`).
- `src/lib/data.ts`: nueva `createBusinessFull({ codigo, name, admin_name, email, phone, plan_type })` que inserta con `subscription_status: 'active'` y `next_billing_date` calculada; nueva `updateBusinessInfo(id, { name, email, phone })` con `update` acotado a esas columnas (no toca plan/estado/fechas). `createBusiness` y `updateBusinessSubscription` existentes quedan sin cambios.
- `src/components/SuperAdminApp.tsx`: dos componentes nuevos y modulares en el mismo archivo — `NewBusinessModal` y `EditBusinessModal` — más el estado para abrirlos. Reutilizan las utilidades de estilo existentes (`action-control`, `action-surface`).
- Notificaciones: patrón de aviso ya usado en el panel (mensaje flotante de éxito/error) para no introducir dependencias nuevas.
- Sin cambios en cálculos de suscripción, comisiones, cobros ni liquidación.
