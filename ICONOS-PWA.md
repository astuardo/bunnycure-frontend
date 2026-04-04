# 🎨 Generación de Iconos PWA para BunnyCure

## Iconos Requeridos

Para que la PWA funcione correctamente, necesitas los siguientes iconos:

| Archivo | Tamaño | Propósito |
|---------|--------|-----------|
| `icon-192.png` | 192x192 | Icono estándar, requerido por Chrome |
| `icon-512.png` | 512x512 | Icono grande, requerido por Chrome |
| `icon-maskable-512.png` | 512x512 | Icono maskable para Android (adaptive icon) |
| `apple-touch-icon.png` | 180x180 | Icono para iOS/Safari |
| `favicon.ico` | 32x32 + 16x16 | Favicon clásico (opcional si ya tienes favicon.svg) |

## Método 1: Usando una herramienta online (Recomendado)

### PWA Asset Generator
1. Ir a: https://www.pwabuilder.com/imageGenerator
2. Subir tu logo de BunnyCure (mínimo 512x512, preferible 1024x1024)
3. Ajustar padding si es necesario
4. Descargar todos los iconos generados
5. Copiar los archivos a `public/`

### Favicon Generator
1. Ir a: https://realfavicongenerator.net/
2. Subir tu logo
3. Generar todos los tamaños
4. Descargar el paquete
5. Copiar a `public/`

## Método 2: Usando ImageMagick (Línea de comandos)

### Instalar ImageMagick
```bash
# Windows (con Chocolatey)
choco install imagemagick

# O descargar desde: https://imagemagick.org/script/download.php
```

### Generar iconos desde un logo original
```bash
# Asumiendo que tienes logo.png de 1024x1024 o mayor
cd public

# Icono 192x192
magick logo.png -resize 192x192 icon-192.png

# Icono 512x512
magick logo.png -resize 512x512 icon-512.png

# Icono maskable (con padding del 10%)
magick logo.png -resize 410x410 -background transparent -gravity center -extent 512x512 icon-maskable-512.png

# Apple touch icon 180x180
magick logo.png -resize 180x180 apple-touch-icon.png

# Favicon 32x32
magick logo.png -resize 32x32 favicon-32.png

# Favicon ICO (múltiples tamaños)
magick logo.png -resize 16x16 -resize 32x32 -resize 48x48 favicon.ico
```

## Método 3: Usando Sharp (Node.js)

### Instalar sharp
```bash
npm install -g sharp-cli
```

### Generar iconos
```bash
cd public

# Iconos estándar
sharp -i logo.png -o icon-192.png resize 192 192
sharp -i logo.png -o icon-512.png resize 512 512

# Icono maskable con padding
sharp -i logo.png -o icon-maskable-512.png resize 410 extend "{top:51,bottom:51,left:51,right:51,background:'transparent'}"
```

## Validación de Iconos Maskable

Para verificar que tu icono maskable se ve bien en todos los dispositivos:
1. Ir a: https://maskable.app/editor
2. Subir tu `icon-maskable-512.png`
3. Verificar que se ve bien con las diferentes formas de Android (círculo, squircle, etc.)
4. Ajustar padding si es necesario (recomendado: 10-20% de padding)

## Checklist de Iconos

Una vez que hayas generado todos los iconos, verifica:

- [ ] `icon-192.png` existe en `public/`
- [ ] `icon-512.png` existe en `public/`
- [ ] `icon-maskable-512.png` existe en `public/`
- [ ] `apple-touch-icon.png` o usar `icon-192.png` como fallback
- [ ] Los iconos son PNG con fondo transparente
- [ ] El icono maskable tiene suficiente padding (10-20%)
- [ ] Todos los iconos mantienen las proporciones correctas

## Ubicación de los Archivos

```
bunnycure-frontend/
└── public/
    ├── icon-192.png           ✅ Requerido
    ├── icon-512.png           ✅ Requerido
    ├── icon-maskable-512.png  ✅ Requerido
    ├── apple-touch-icon.png   ⚠️  Recomendado
    ├── favicon.svg            ✅ Ya existe
    ├── favicon.ico            ⚠️  Opcional
    └── manifest.json          ✅ Ya configurado
```

## Próximos Pasos

Una vez que tengas todos los iconos:

1. Copiar todos los archivos a `public/`
2. Ejecutar `npm install` para instalar las dependencias PWA
3. Ejecutar `npm run build` para generar el build con PWA
4. Probar la instalación en Chrome DevTools > Application > Manifest

## Recursos Adicionales

- [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
- [Maskable Icon Editor](https://maskable.app/editor)
- [Favicon Generator](https://realfavicongenerator.net/)
- [ImageMagick Documentation](https://imagemagick.org/script/command-line-options.php)

---

**Nota**: Por ahora, los iconos están referenciados en `manifest.json` y `index.html`, pero los archivos aún no existen. Sigue cualquiera de los métodos anteriores para generarlos.
