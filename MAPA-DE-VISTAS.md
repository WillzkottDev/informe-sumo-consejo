# Mapa de vistas — Informes Estaca Ñuñoa

```mermaid
flowchart TD
    A[Ingreso protegido] --> B{Perfil}
    B --> C[Administrador de Estaca]
    B --> D[Sumo Consejo]
    B --> E[Organización]
    C --> C1[Resumen Estaca]
    C --> C2[Informe mensual]
    C --> C3[Consulta por barrio]
    C --> C4[Historial]
    C --> C5[Administración]
    D --> D1[Informe mensual asignado]
    D --> D2[Consulta de barrios asignados]
    D --> D3[Historial asignado]
    E --> E1[Informe de su organización]
    E --> E2[Consulta de su organización]
    E --> E3[Historial de su organización]
```

## Permisos por perfil

| Vista | Administrador de Estaca | Sumo Consejo | Organización |
|---|---|---|---|
| Resumen Estaca | Todos los barrios | No | No |
| Ingreso de informe | Cualquier barrio | Barrios asignados | Su organización, por barrio |
| Consulta por barrio | Todo, incluidos pendientes | Informes del Sumo Consejo y aportes aprobados de sus barrios | Aportes aprobados de su organización en los barrios asignados |
| Historial | Informes y organizaciones | Información de sus barrios | Información de su organización |
| Aprobación y publicación | Sí | No | No |
| Barrios y usuarios | Sí | No | No |

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
