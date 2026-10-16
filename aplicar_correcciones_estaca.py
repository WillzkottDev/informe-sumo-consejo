#!/usr/bin/env python3
"""Aplica correcciones UI al Informe de Estaca (repo existente)."""
from pathlib import Path
import sys

root = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv)>1 else Path.cwd()
changes = {
    'app/portal-client.tsx': [(
'''        <TabsList className="mobile-bottom-nav" variant="line" aria-label="Navegación principal">
          {navItems.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              <item.icon />
              <span>{item.label.replace("Resumen ", "").replace("Informe ", "")}</span>
            </TabsTrigger>
          ))}
        </TabsList>''',
'''        {/* En móvil la navegación queda disponible en el menú lateral. */}''')],
    'app/portal-extra.css': [
        ('grid-template-columns:34px minmax(160px,1fr) minmax(150px,.8fr) 92px 16px','grid-template-columns:34px minmax(160px,260px) minmax(0,1fr) 92px 16px'),
        ('.member-wards{display:flex;flex-wrap:wrap;gap:4px}', '.member-wards{display:flex;flex-wrap:wrap;justify-content:flex-start;min-width:0;gap:4px}'),
        ('@media (max-width:760px){.portal-shell','@media (min-width:761px) and (max-width:1050px){.member-row{grid-template-columns:34px minmax(150px,180px) minmax(0,1fr) 76px 16px;gap:10px}}\n@media (max-width:760px){.portal-shell'),
        ('padding:18px 14px calc(96px + env(safe-area-inset-bottom))','padding:18px 14px calc(24px + env(safe-area-inset-bottom))'),
        ('margin:4px -14px calc(-96px - env(safe-area-inset-bottom))','margin:4px -14px 0'),
        ('padding-bottom:calc(112px + env(safe-area-inset-bottom))','padding-bottom:calc(24px + env(safe-area-inset-bottom))'),
        ('.report-footer{bottom:74px;margin-bottom:0;padding-bottom:12px}', '.report-footer{bottom:0;margin-bottom:0;padding-bottom:calc(12px + env(safe-area-inset-bottom))}'),
        ('padding-bottom:calc(110px + env(safe-area-inset-bottom))','padding-bottom:calc(24px + env(safe-area-inset-bottom))'),
    ],
    'app/globals.css': [
        ('padding:84px 14px calc(104px + env(safe-area-inset-bottom))!important','padding:84px 14px calc(24px + env(safe-area-inset-bottom))!important'),
    ],
}

updates = {}
for path, rules in changes.items():
    file = root/path
    if not file.is_file():
        raise SystemExit(f'ERROR: No encuentro {file}. Ejecuta el script en la carpeta raíz del proyecto.')
    content = file.read_text(encoding='utf-8')
    for old, new in rules:
        occur = content.count(old)
        if occur == 1:
            content = content.replace(old, new, 1)
        elif occur == 0 and new in content:
            print(f'  Ya aplicado: {path} ({old[:45]}...)')
        else:
            raise SystemExit(f'ERROR: {path} no coincide con la versión prevista (coincidencias: {occur}). No se modificó ningún archivo.')
    updates[file] = content
for file, content in updates.items():
    file.write_text(content, encoding='utf-8')
    print('ACTUALIZADO:', file.relative_to(root))
print('\nListo: barra inferior eliminada, barrios alineados a la izquierda y espacio móvil corregido.')
print('Revisa los cambios y súbelos a GitHub mediante un commit.')
