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
    C --> C6[Bandeja de la presidencia]
    C --> C7[Notas para consejo de estaca]
    C --> C8[Manual de ayuda]
    D --> D1[Informe mensual asignado]
    D --> D2[Consulta de barrios asignados]
    D --> D3[Historial asignado]
    D --> D4[Manual de ayuda]
    D --> M[Mensaje directo a la presidencia]
    E --> E1[Informe de su organización]
    E --> E2[Publicaciones de toda la estaca]
    E --> E3[Historial de publicaciones y aportes propios]
    E --> E4[Manual de ayuda]
    E --> M
```

## Permisos por perfil

| Vista | Administrador de Estaca | Sumo Consejo | Organización |
|---|---|---|---|
| Resumen Estaca | Todos los barrios | No | No |
| Ingreso de informe | Consulta y administra | Barrios asignados | Su organización, por barrio |
| Consulta por barrio | Todo, incluidos pendientes | Comentarios publicados de sumos y organizaciones en sus barrios asignados | Comentarios publicados de sumos y organizaciones en todos los barrios activos |
| Historial | Informes y organizaciones | Informes propios y publicaciones de sus barrios | Aportes propios y publicaciones de toda la estaca |
| Aprobaciones de Estaca | Sí | No | No |
| Administración de cuentas y barrios | Sí | No | No |
| Mensaje directo a la presidencia | Bandeja de todos los informantes | Envío e historial propio | Envío e historial propio |
| Destacar y consultar notas de consejo | Tabla común por mes | Acceso exclusivo de Administración | Acceso exclusivo de Administración |
| Manual de ayuda | Guía de administración | Guía de Sumo Consejo | Guía de su organización |

## Flujo de publicación

```mermaid
flowchart TD
    A[Organización guarda un aporte] --> C[Administración revisa]
    B[Sumo envía su informe] --> C
    C --> D[Publica el comentario elegido]
    C --> E[Destaca una frase para el consejo]
    D --> F[Organizaciones de toda la estaca]
    D --> G[Sumos asignados al barrio]
    E --> H[Notas privadas de Administración]
```

Cada comentario del Sumo Consejo tiene su propia aprobación. Cuando cambia un texto publicado, vuelve a revisión. Los demás comentarios aprobados conservan su publicación.
