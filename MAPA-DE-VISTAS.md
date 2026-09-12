# Mapa de vistas — Informes Estaca Ñuñoa

```mermaid
flowchart TD
    A[Ingreso protegido] --> B{Perfil}
    B --> C[Administrador de Estaca]
    B --> D[Sumo Consejo]
    B --> E[Organización]
    C --> C1[Resumen Estaca]
    C --> C2[Consulta por barrio]
    C --> C3[Historial completo]
    C --> C4[Aprobaciones de Estaca]
    C --> C5[Configuración de cuentas]
    D --> D1[Informe mensual asignado]
    D --> D2[Consulta de barrios asignados]
    D --> D3[Historial asignado]
    D --> D4[Manual de ayuda]
    E --> E1[Informe de su organización]
    E --> E2[Consulta de su organización]
    E --> E3[Historial de su organización]
    E --> E4[Manual de ayuda]
```

## Permisos por perfil

| Vista | Administrador de Estaca | Sumo Consejo | Organización |
|---|---|---|---|
| Resumen Estaca | Todos los barrios | No | No |
| Ingreso de informe | No; solo consulta y administra | Barrios asignados | Su organización, por barrio |
| Consulta por barrio | Todo, incluidos pendientes | Informes del Sumo Consejo y aportes aprobados de sus barrios | Aportes aprobados de su organización en los barrios asignados |
| Historial | Informes y organizaciones | Información de sus barrios | Información de su organización |
| Aprobaciones de Estaca | Sí; vista independiente | No | No |
| Administración de cuentas y barrios | Sí | No | No |
| Manual de ayuda | No | Guía de Sumo Consejo | Guía de su organización |

## Flujo de publicación

```mermaid
flowchart LR
    A[Organización escribe] --> B[Guardado automático]
    B --> C[Pendiente de aprobación]
    C --> D[Administrador revisa]
    D --> E[Aprobar y publicar]
    E --> F[Visible según permisos]
```

Los aportes de organizaciones no aparecen a otros usuarios hasta ser aprobados. El administrador puede verlos y modificarlos antes de publicarlos.
