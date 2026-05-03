# Parada da Pizza — CSS organizado

Estrutura criada:

```txt
css/
├── base.css
├── index.css
├── admin.css
├── mesas.css
├── operacional.css
└── print.css
```

## Como usar

### index.html
```html
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/index.css">
```

### admin.html
```html
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/admin.css">
<link rel="stylesheet" href="css/print.css">
```

### admin-mesas.html
```html
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/mesas.css">
```

## Observação
Os arquivos antigos devem ser mantidos até você testar tudo. Depois, pode remover o style.css antigo e o mesas.css antigo da raiz.
